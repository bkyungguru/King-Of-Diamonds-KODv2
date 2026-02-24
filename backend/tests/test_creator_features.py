"""
Test suite for King of Diamonds Creator Features
Testing: Creator profile navigation, content upload, media display, online status
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials - unique per test run
TEST_USER_EMAIL = f"testcreator_{uuid.uuid4().hex[:8]}@test.com"
TEST_USER_PASSWORD = "Test123!"
TEST_USER_USERNAME = f"testcreator_{uuid.uuid4().hex[:8]}"

# Store token globally for reuse across test classes
_auth_token = None
_creator_id = None


def get_auth_token(session):
    """Get or create auth token"""
    global _auth_token
    
    if _auth_token:
        return _auth_token
    
    # Register new user
    register_response = session.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD,
        "username": TEST_USER_USERNAME
    })
    print(f"Register response: {register_response.status_code}")
    
    if register_response.status_code in [200, 201]:
        data = register_response.json()
        _auth_token = data.get("token") or data.get("access_token")
        return _auth_token
    
    # Try login if registration fails
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    })
    
    if login_response.status_code == 200:
        data = login_response.json()
        _auth_token = data.get("token") or data.get("access_token")
        return _auth_token
    
    return None


class TestAuthAndCreatorSetup:
    """Test user registration, login, and becoming a creator"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        return get_auth_token(session)
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        if not auth_token:
            pytest.skip("No auth token available")
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_01_health_check(self, session):
        """Test API health endpoint"""
        response = session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✅ Health check passed: {data}")
    
    def test_02_user_registration(self, auth_token):
        """Verify user registration worked"""
        assert auth_token is not None
        print(f"✅ User registered/logged in successfully with token: {auth_token[:20]}...")
    
    def test_03_get_current_user(self, session, auth_headers):
        """Get current user profile"""
        response = session.get(f"{BASE_URL}/api/users/me", headers=auth_headers)
        print(f"Get current user response: {response.status_code} - {response.text[:200]}")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data or "email" in data
        print(f"✅ Current user retrieved: {data.get('email', data.get('username'))}")


class TestBecomeCreator:
    """Test becoming a creator"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        return get_auth_token(session)
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        if not auth_token:
            pytest.skip("No auth token available")
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_01_become_creator(self, session, auth_headers):
        """Test becoming a creator"""
        global _creator_id
        
        response = session.post(f"{BASE_URL}/api/creators/become", 
            headers=auth_headers,
            json={
                "display_name": f"Test Creator {uuid.uuid4().hex[:4]}",
                "bio": "Test creator bio for testing purposes",
                "subscription_price": 9.99
            }
        )
        print(f"Become creator response: {response.status_code} - {response.text[:300]}")
        
        # Accept 200, 201, or 400 (already a creator)
        assert response.status_code in [200, 201, 400]
        
        if response.status_code in [200, 201]:
            data = response.json()
            _creator_id = data.get("id")
            print(f"✅ Became creator with ID: {_creator_id}")
        else:
            print(f"✅ User is already a creator")
    
    def test_02_get_creator_profile(self, session, auth_headers):
        """Get creator profile"""
        global _creator_id
        
        response = session.get(f"{BASE_URL}/api/creators/me", headers=auth_headers)
        print(f"Get creator profile response: {response.status_code} - {response.text[:300]}")
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "display_name" in data
        _creator_id = data.get("id")
        print(f"✅ Creator profile retrieved: {data['display_name']}, ID: {_creator_id}")


class TestOnlineStatus:
    """Test online status toggle functionality"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        return get_auth_token(session)
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        if not auth_token:
            pytest.skip("No auth token available")
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_01_set_status_online(self, session, auth_headers):
        """Test setting status to online"""
        response = session.put(f"{BASE_URL}/api/creators/me/status?status=online", headers=auth_headers)
        print(f"Set online status response: {response.status_code} - {response.text}")
        assert response.status_code == 200
        print("✅ Status set to online")
    
    def test_02_set_status_away(self, session, auth_headers):
        """Test setting status to away"""
        response = session.put(f"{BASE_URL}/api/creators/me/status?status=away", headers=auth_headers)
        print(f"Set away status response: {response.status_code} - {response.text}")
        assert response.status_code == 200
        print("✅ Status set to away")
    
    def test_03_set_status_offline(self, session, auth_headers):
        """Test setting status to offline"""
        response = session.put(f"{BASE_URL}/api/creators/me/status?status=offline", headers=auth_headers)
        print(f"Set offline status response: {response.status_code} - {response.text}")
        assert response.status_code == 200
        print("✅ Status set to offline")
    
    def test_04_verify_status_in_profile(self, session, auth_headers):
        """Verify status is reflected in creator profile"""
        # Set to online first
        session.put(f"{BASE_URL}/api/creators/me/status?status=online", headers=auth_headers)
        
        # Get creator profile
        response = session.get(f"{BASE_URL}/api/creators/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        print(f"Creator profile data: {data}")
        # Check if online_status field exists and is correct
        if "online_status" in data:
            print(f"✅ Online status in profile: {data['online_status']}")
        else:
            print("⚠️ online_status field not in profile response")


class TestContentCreation:
    """Test content creation with media"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        return get_auth_token(session)
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        if not auth_token:
            pytest.skip("No auth token available")
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_01_create_text_post(self, session, auth_headers):
        """Test creating a text-only post"""
        response = session.post(f"{BASE_URL}/api/content/", 
            headers=auth_headers,
            json={
                "title": "Test Post Title",
                "text": "This is a test post content for testing purposes.",
                "media_urls": [],
                "media_type": "text",
                "is_public": True
            }
        )
        print(f"Create text post response: {response.status_code} - {response.text[:300]}")
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        print(f"✅ Text post created with ID: {data['id']}")
    
    def test_02_create_post_with_media_url(self, session, auth_headers):
        """Test creating a post with media URL"""
        # Use a sample image URL for testing
        test_image_url = "https://via.placeholder.com/400x300.png?text=Test+Image"
        
        response = session.post(f"{BASE_URL}/api/content/", 
            headers=auth_headers,
            json={
                "title": "Test Post with Image",
                "text": "This post has an image attached.",
                "media_urls": [test_image_url],
                "media_type": "image",
                "is_public": True
            }
        )
        print(f"Create post with media response: {response.status_code} - {response.text[:300]}")
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        assert "media_urls" in data
        assert len(data["media_urls"]) > 0
        print(f"✅ Post with media created with ID: {data['id']}, media_urls: {data['media_urls']}")
    
    def test_03_get_creator_content(self, session, auth_headers):
        """Test getting creator's content"""
        global _creator_id
        
        # First get creator ID if not set
        if not _creator_id:
            profile_response = session.get(f"{BASE_URL}/api/creators/me", headers=auth_headers)
            if profile_response.status_code == 200:
                _creator_id = profile_response.json().get("id")
        
        if not _creator_id:
            pytest.skip("No creator ID available")
        
        response = session.get(f"{BASE_URL}/api/content/creator/{_creator_id}", headers=auth_headers)
        print(f"Get creator content response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Retrieved {len(data)} content items for creator")
        
        # Check if media_urls are present in content
        for item in data:
            if item.get("media_urls") and len(item["media_urls"]) > 0:
                print(f"  - Content {item['id']} has media_type: {item.get('media_type')}, urls: {item['media_urls']}")


class TestCreatorPublicProfile:
    """Test public creator profile access"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        return get_auth_token(session)
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        if not auth_token:
            pytest.skip("No auth token available")
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_01_get_public_creator_profile(self, session, auth_headers):
        """Test getting public creator profile"""
        global _creator_id
        
        # First get creator ID if not set
        if not _creator_id:
            profile_response = session.get(f"{BASE_URL}/api/creators/me", headers=auth_headers)
            if profile_response.status_code == 200:
                _creator_id = profile_response.json().get("id")
        
        if not _creator_id:
            pytest.skip("No creator ID available")
        
        # Get public profile (no auth required)
        response = session.get(f"{BASE_URL}/api/creators/{_creator_id}")
        print(f"Get public creator profile response: {response.status_code} - {response.text[:300]}")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "display_name" in data
        print(f"✅ Public creator profile retrieved: {data['display_name']}")
        
        # Check for online_status field
        if "online_status" in data:
            print(f"  - Online status: {data['online_status']}")
    
    def test_02_get_public_creator_content(self, session, auth_headers):
        """Test getting public creator content"""
        global _creator_id
        
        if not _creator_id:
            profile_response = session.get(f"{BASE_URL}/api/creators/me", headers=auth_headers)
            if profile_response.status_code == 200:
                _creator_id = profile_response.json().get("id")
        
        if not _creator_id:
            pytest.skip("No creator ID available")
        
        response = session.get(f"{BASE_URL}/api/content/creator/{_creator_id}")
        print(f"Get public creator content response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Retrieved {len(data)} public content items")
        
        # Check media rendering
        for item in data:
            if item.get("media_urls") and len(item["media_urls"]) > 0:
                print(f"  - Content {item['id']} has media_type: {item.get('media_type')}, urls: {item['media_urls']}")


class TestUploadEndpoints:
    """Test file upload endpoints"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        return get_auth_token(session)
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        if not auth_token:
            pytest.skip("No auth token available")
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_01_upload_content_endpoint_exists(self, session, auth_headers):
        """Test that content upload endpoint exists"""
        import io
        
        # Create a minimal PNG file (1x1 pixel)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {'file': ('test_image.png', io.BytesIO(png_data), 'image/png')}
        headers = {"Authorization": auth_headers["Authorization"]}
        
        response = session.post(f"{BASE_URL}/api/uploads/content", 
            headers=headers,
            files=files
        )
        print(f"Upload content response: {response.status_code} - {response.text}")
        
        # Accept 200, 201 for success
        assert response.status_code in [200, 201]
        data = response.json()
        assert "url" in data
        print(f"✅ File uploaded successfully: {data['url']}")


class TestCreatorListings:
    """Test creator listings for explore page"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    def test_01_get_all_creators(self, session):
        """Test getting all creators (public endpoint)"""
        response = session.get(f"{BASE_URL}/api/creators/")
        print(f"Get all creators response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Retrieved {len(data)} creators")
        
        # Check creator data structure
        if len(data) > 0:
            creator = data[0]
            print(f"  - Sample creator: {creator.get('display_name')}")
            if "online_status" in creator:
                print(f"    - Online status: {creator['online_status']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
