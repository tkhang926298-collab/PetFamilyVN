
import pytest
from unittest.mock import MagicMock, patch
from admin_tool.crawler.extract_data import fetch_url, parse_content

@pytest.fixture
def mock_response():
    mock = MagicMock()
    mock.status_code = 200
    mock.text = '<html><body><h1>Test Disease</h1><div class="article-body"><h2>Symptoms</h2><p>Fever and cough.</p></div></body></html>'
    return mock

@patch('requests.get')
def test_fetch_url_success(mock_get, mock_response):
    mock_get.return_value = mock_response
    url = "https://example.com/disease"
    content = fetch_url(url)
    assert content == mock_response.text

def test_parse_content():
    html = '<html><body><h1>Test Disease</h1><div class="article-body"><h2>Symptoms</h2><p>Fever and cough.</p></div></body></html>'
    url = "https://example.com/disease"
    result = parse_content(html, url)
    
    assert result['title'] == "Test Disease"
    assert "Fever and cough" in result['content_raw']
    assert result['url'] == url
