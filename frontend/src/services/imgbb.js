/**
 * imgBB Image Upload Service
 * Used for all user-uploaded images (avatars, forum posts, messages)
 */

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

/**
 * Upload a File object to imgBB and return the public URL.
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} The public display URL of the uploaded image
 */
export async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    formData.append('image', file);

    const response = await fetch(`${IMGBB_UPLOAD_URL}?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`imgBB upload failed (${response.status}): ${errText}`);
    }

    const result = await response.json();

    if (!result.success) {
        throw new Error('imgBB upload failed: ' + JSON.stringify(result));
    }

    return result.data.display_url;
}
