import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { imageUrl, description, species, force_ai } = await req.json();

        if (!description && !imageUrl) {
            throw new Error("Description or Image URL is required");
        }

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!apiKey || !supabaseUrl || !supabaseKey) {
            throw new Error("Server configuration error (API Keys)");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // --- SCENARIO 1: IMAGE ANALYSIS (Visual Diagnosis) ---
        if (imageUrl) {
            const imageResp = await fetch(imageUrl);
            if (!imageResp.ok) throw new Error("Failed to fetch image");
            const imageBlob = await imageResp.blob();
            const arrayBuffer = await imageBlob.arrayBuffer();
            const base64Image = btoa(
                new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            const prompt = `
          Bạn là chuyên gia thú y AI. 
          Hình ảnh và mô tả: '${description || "Không có"}'.
          Phân tích tình trạng, chẩn đoán, mức độ nghiêm trọng, và phác đồ điều trị.
          JSON: { "diagnosis": "...", "confidence": "...", "severity": "...", "description": "...", "recommendations": [], "diet_vi": {...} }
        `;

            const result = await model.generateContent([
                prompt,
                { inlineData: { data: base64Image, mimeType: imageBlob.type || "image/jpeg" } },
            ]);

            const responseText = result.response.text();
            const cleanJson = responseText.replace(/```json|```/g, '').trim();
            const data = JSON.parse(cleanJson);

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // --- SCENARIO 2: TEXT ANALYSIS (Triage -> DB -> AI) ---

        // 1. Triage & ID Prediction
        const triagePrompt = `
        Analyze this pet symptom: "${description}". Species: ${species || 'unknown'}.
        1. Identify the most likely disease/condition.
        2. Diagnosis Match: Provide 'suspected_id' (English snake_case, e.g. 'parvovirus_canine', 'otitis_externa'). If unsure, use 'unknown'.
        3. Determine if visual confirmation is strictly needed (needs_image).
        
        Output JSON: { "suspected_id": "...", "needs_image": boolean, "reason": "..." }
        `;

        const triageResult = await model.generateContent(triagePrompt);
        const triageText = triageResult.response.text().replace(/```json|```/g, '').trim();
        let triageJson = {};
        try { triageJson = JSON.parse(triageText); } catch (e) { console.error("Triage Parse Error", e); }

        const suspectedId = triageJson.suspected_id;

        // 2. Lookup in Supabase
        if (suspectedId && suspectedId !== 'unknown' && !force_ai) {
            const supabase = createClient(supabaseUrl, supabaseKey);

            const { data: dbData, error } = await supabase
                .from('diseases')
                .select('*')
                .eq('disease_id', suspectedId)
                .maybeSingle();

            if (dbData) {
                // Found in DB! Return DB data joined with Triage info
                return new Response(JSON.stringify({
                    source: 'database',
                    diagnosis: dbData.disease_name_vi,
                    severity: dbData.severity,
                    description: dbData.symptoms_vi,
                    recommendations: [dbData.treatment_vi, ...(dbData.prescription_otc || [])],
                    diet_vi: dbData.diet_info,
                    visual_confirmation_required: dbData.visual_confirmation_required,
                    reference_image: dbData.cloudinary_links?.[0]?.cloudinary_url || null,
                    disease_id: dbData.disease_id, // Important for follow-up logic
                    raw_db: dbData
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
        }

        // 3. Fallback: Pure AI Diagnosis
        const aiPrompt = `
          Bạn là chuyên gia thú y AI.
          Triệu chứng: '${description}'. Loài: ${species || 'unknown'}.
          Chẩn đoán, mức độ nghiêm trọng, phác đồ điều trị.
          JSON: { "source": "ai", "diagnosis": "...", "severity": "...", "description": "...", "recommendations": [], "diet_vi": {...} }
        `;

        const aiResult = await model.generateContent(aiPrompt);
        const aiJson = JSON.parse(aiResult.response.text().replace(/```json|```/g, '').trim());

        return new Response(JSON.stringify(aiJson), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
