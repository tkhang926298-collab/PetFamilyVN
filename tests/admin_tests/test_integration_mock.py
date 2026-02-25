
import pytest
from unittest.mock import MagicMock, patch, mock_open
import pandas as pd
import os
from admin_tool.utils.export_handler import save_to_review
from admin_tool.supabase_updater.upload_csv import upload_csv_to_supabase

@pytest.fixture
def sample_data():
    return [{
        "url": "http://example.com",
        "title": "Test Disease",
        "disease_name_vi": "Bệnh Test",
        "symptoms_vi": "Ho, Sốt",
        "treatment_vi": "Uống thuốc",
        "prevention_vi": "Tiêm vacxin",
        "questions_json": "[]",
        "cloudinary_links_json": "[]",
        "status": "Review"
    }]

def test_export_flow(sample_data, tmp_path):
    # 1. Test Export
    # We can't easily mock the file system for pandas to specific path in admin_tool/review unless we redirect it or mock to_csv
    # But save_to_review hardcodes the path.
    # Let's mock pandas.DataFrame.to_csv and to_excel to verify they are called.
    
    with patch('pandas.DataFrame.to_csv') as mock_to_csv, \
         patch('pandas.DataFrame.to_excel') as mock_to_excel:
         
        save_to_review(sample_data)
        
        assert mock_to_csv.called
        assert mock_to_excel.called

def test_upload_flow(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "test_key")
    monkeypatch.setenv("CLOUDINARY_CLOUD_NAME", "test_cloud")
    monkeypatch.setenv("CLOUDINARY_API_KEY", "test_key")
    monkeypatch.setenv("CLOUDINARY_API_SECRET", "test_secret")

    # 2. Test Upload (Process CSV)
    # Mock reading CSV
    mock_df = pd.DataFrame([{
        "disease_id": "123", # Generated
        "disease_name_vi": "Bệnh Test",
        "symptoms_vi": "Ho",
        "treatment_vi": "Thuốc",
        "prevention_vi": "Vaccine",
        "images": "[]",
        "status": "Approved"
    }])
    
    with patch('pandas.read_csv', return_value=mock_df), \
         patch('admin_tool.supabase_updater.upload_csv.create_client') as mock_create_client, \
         patch('admin_tool.supabase_updater.upload_csv.setup_cloudinary', return_value=True) as mock_setup_cloudinary, \
         patch('admin_tool.supabase_updater.upload_csv.cloudinary.api.resources_by_tag') as mock_resources_by_tag, \
         patch('admin_tool.supabase_updater.upload_csv.cloudinary.uploader.add_tag') as mock_add_tag, \
         patch('admin_tool.supabase_updater.upload_csv.cloudinary.uploader.remove_tag') as mock_remove_tag:
         
        # Mock Supabase Client and Insert
        mock_supabase = MagicMock()
        mock_create_client.return_value = mock_supabase
        mock_insert = MagicMock()
        mock_supabase.table.return_value.upsert.return_value = mock_insert
        mock_insert.execute.return_value.data = [{"id": "123", "name": "Bệnh Test"}]
        
        # Mock Cloudinary Resources
        mock_resources_by_tag.return_value = {'resources': [{'public_id': 'img1'}]}
        
        # Call upload_csv_to_supabase
        # We need a dummy file path
        success, fails, errors = upload_csv_to_supabase("dummy_path.csv")
        
        # Verify Supabase Upsert called
        mock_supabase.table.assert_called_with("diseases")
        mock_insert.execute.assert_called()
        
        # Verify Cloudinary Update called (if image logic triggers it)
        # In our mock data, images is empty string/list, logic might skip.
        # Let's adjust mock_df to have images if we want to test that.
        
        assert success == 1
