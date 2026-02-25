
import pytest
from unittest.mock import MagicMock, patch
import os
from admin_tool.utils.image_handler import process_images, setup_cloudinary

@pytest.fixture
def mock_env(monkeypatch):
    monkeypatch.setenv("CLOUDINARY_CLOUD_NAME", "test_cloud")
    monkeypatch.setenv("CLOUDINARY_API_KEY", "test_key")
    monkeypatch.setenv("CLOUDINARY_API_SECRET", "test_secret")

@patch('cloudinary.config')
def test_setup_cloudinary(mock_config, mock_env):
    assert setup_cloudinary() is True
    mock_config.assert_called_with(
        cloud_name="test_cloud",
        api_key="test_key",
        api_secret="test_secret"
    )

@patch('admin_tool.utils.image_handler.setup_cloudinary')
@patch('requests.get')
@patch('PIL.Image.open')
@patch('cloudinary.uploader.upload')
def test_process_images_success(mock_upload, mock_image_open, mock_get, mock_setup):
    mock_setup.return_value = True
    
    # Mock Response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = b'fake_image_bytes'
    mock_get.return_value = mock_response
    
    # Mock Image
    mock_img = MagicMock()
    mock_image_open.return_value = mock_img
    
    # Mock Upload
    mock_upload.return_value = {
        "secure_url": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        "public_id": "sample"
    }
    
    urls = ["https://example.com/image.jpg"]
    result = process_images(urls, "disease_123")
    
    assert len(result) == 1
    assert result[0]['original_url'] == urls[0]
    assert result[0]['cloudinary_url'] == "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    assert result[0]['public_id'] == "sample"
