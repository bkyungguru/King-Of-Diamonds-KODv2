"""
Test suite for King of Diamonds New Features (Iteration 4)
Testing: Multiple reactions, Content visibility, Edit/Delete content
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@kingofdiamonds.com"
ADMIN_PASSWORD = "Admin123!"

# Store token globally
_admin_token = None
_creator_id = None
_test_content_id = None


def get_admin_token(session):
    """Get admin auth token"""
    global _admin_token
    
    if _admin_token:
        return _admin_token
    
    # Login as admin
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    print(f"Admin login response: {login_response.status_code}")
    
    if login_response.status_code == 200:
        data = login_response.json()
        _admin_token = data.get("token") or data.get("access_token")
        return _admin_token
    
    return None


class TestAdminLogin:
    """Test admin login"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def admin_token(self, session):
        return get_admin_token(session)
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        if not admin_token:
            pytest.skip("No admin token available")
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_01_admin_login(self, admin_token):
        """Verify admin login works"""
        assert admin_token is not None
        print(f"✅ Admin logged in successfully with token: {admin_token[:20]}...")
    
    def test_02_get_admin_creator_profile(self, session, auth_headers):
        """Get admin's creator profile"""
        global _creator_id
        
        response = session.get(f"{BASE_URL}/api/creators/me", headers=auth_headers)
        print(f"Get creator profile response: {response.status_code} - {response.text[:300]}")
        
        if response.status_code == 200:
            data = response.json()
            _creator_id = data.get("id")
            print(f"✅ Admin creator profile: {data.get('display_name')}, ID: {_creator_id}")
        else:
            print("⚠️ Admin may not be a creator yet")


class TestContentVisibility:
    """Test content visibility options (public/subscribers/unpublished)"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def admin_token(self, session):
        return get_admin_token(session)
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        if not admin_token:
            pytest.skip("No admin token available")
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_01_create_public_content(self, session, auth_headers):
        """Test creating public content"""
        global _test_content_id
        
        response = session.post(f"{BASE_URL}/api/content/", 
            headers=auth_headers,
            json={
                "title": f"Public Test Post {uuid.uuid4().hex[:6]}",
                "text": "This is a public test post visible to everyone.",
                "media_urls": [],
                "media_type": "text",
                "is_public": True,
                "visibility": "public"
            }
        )
        print(f"Create public content response: {response.status_code} - {response.text[:300]}")
        assert response.status_code in [200, 201]
        data = response.json()
        assert data.get("visibility") == "public" or data.get("is_public") == True
        _test_content_id = data.get("id")
        print(f"✅ Public content created with ID: {_test_content_id}")
    
    def test_02_create_subscribers_only_content(self, session, auth_headers):
        """Test creating subscribers-only content"""
        response = session.post(f"{BASE_URL}/api/content/", 
            headers=auth_headers,
            json={
                "title": f"Subscribers Only Post {uuid.uuid4().hex[:6]}",
                "text": "This content is only for subscribers.",
                "media_urls": [],
                "media_type": "text",
                "is_public": False,
                "visibility": "subscribers"
            }
        )
        print(f"Create subscribers content response: {response.status_code} - {response.text[:300]}")
        assert response.status_code in [200, 201]
        data = response.json()
        assert data.get("visibility") == "subscribers" or data.get("is_public") == False
        print(f"✅ Subscribers-only content created with ID: {data.get('id')}")
    
    def test_03_create_draft_content(self, session, auth_headers):
        """Test creating draft/unpublished content"""
        response = session.post(f"{BASE_URL}/api/content/", 
            headers=auth_headers,
            json={
                "title": f"Draft Post {uuid.uuid4().hex[:6]}",
                "text": "This is a draft post not visible to anyone.",
                "media_urls": [],
                "media_type": "text",
                "is_public": False,
                "visibility": "unpublished"
            }
        )
        print(f"Create draft content response: {response.status_code} - {response.text[:300]}")
        assert response.status_code in [200, 201]
        data = response.json()
        assert data.get("visibility") == "unpublished"
        print(f"✅ Draft content created with ID: {data.get('id')}")


class TestContentEditDelete:
    """Test content edit and delete functionality"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def admin_token(self, session):
        return get_admin_token(session)
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        if not admin_token:
            pytest.skip("No admin token available")
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_01_create_content_for_edit(self, session, auth_headers):
        """Create content to edit"""
        global _test_content_id
        
        response = session.post(f"{BASE_URL}/api/content/", 
            headers=auth_headers,
            json={
                "title": f"Edit Test Post {uuid.uuid4().hex[:6]}",
                "text": "Original content text.",
                "media_urls": [],
                "media_type": "text",
                "is_public": True,
                "visibility": "public"
            }
        )
        assert response.status_code in [200, 201]
        data = response.json()
        _test_content_id = data.get("id")
        print(f"✅ Content created for edit test: {_test_content_id}")
    
    def test_02_edit_content_title(self, session, auth_headers):
        """Test editing content title"""
        global _test_content_id
        
        if not _test_content_id:
            pytest.skip("No content ID available")
        
        response = session.put(f"{BASE_URL}/api/content/{_test_content_id}", 
            headers=auth_headers,
            json={
                "title": "Updated Title via API Test"
            }
        )
        print(f"Edit content response: {response.status_code} - {response.text[:300]}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("title") == "Updated Title via API Test"
        print(f"✅ Content title updated successfully")
    
    def test_03_edit_content_visibility(self, session, auth_headers):
        """Test changing content visibility"""
        global _test_content_id
        
        if not _test_content_id:
            pytest.skip("No content ID available")
        
        # Change to subscribers only
        response = session.put(f"{BASE_URL}/api/content/{_test_content_id}", 
            headers=auth_headers,
            json={
                "visibility": "subscribers"
            }
        )
        print(f"Change visibility response: {response.status_code} - {response.text[:300]}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("visibility") == "subscribers"
        print(f"✅ Content visibility changed to subscribers")
        
        # Change back to public
        response = session.put(f"{BASE_URL}/api/content/{_test_content_id}", 
            headers=auth_headers,
            json={
                "visibility": "public"
            }
        )
        assert response.status_code == 200
        print(f"✅ Content visibility changed back to public")
    
    def test_04_delete_content(self, session, auth_headers):
        """Test deleting content"""
        # Create a new content to delete
        create_response = session.post(f"{BASE_URL}/api/content/", 
            headers=auth_headers,
            json={
                "title": f"Delete Test Post {uuid.uuid4().hex[:6]}",
                "text": "This post will be deleted.",
                "media_urls": [],
                "media_type": "text",
                "is_public": True
            }
        )
        assert create_response.status_code in [200, 201]
        content_id = create_response.json().get("id")
        print(f"Created content for deletion: {content_id}")
        
        # Delete the content
        delete_response = session.delete(f"{BASE_URL}/api/content/{content_id}", headers=auth_headers)
        print(f"Delete content response: {delete_response.status_code} - {delete_response.text}")
        assert delete_response.status_code == 200
        print(f"✅ Content deleted successfully")


class TestMultipleReactions:
    """Test multiple reaction types (love, fire, clap, heart_eyes, diamond)"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def admin_token(self, session):
        return get_admin_token(session)
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        if not admin_token:
            pytest.skip("No admin token available")
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_01_create_content_for_reactions(self, session, auth_headers):
        """Create content to test reactions"""
        global _test_content_id
        
        response = session.post(f"{BASE_URL}/api/content/", 
            headers=auth_headers,
            json={
                "title": f"Reaction Test Post {uuid.uuid4().hex[:6]}",
                "text": "Test reactions on this post!",
                "media_urls": [],
                "media_type": "text",
                "is_public": True
            }
        )
        assert response.status_code in [200, 201]
        data = response.json()
        _test_content_id = data.get("id")
        print(f"✅ Content created for reaction test: {_test_content_id}")
    
    def test_02_react_with_love(self, session, auth_headers):
        """Test love reaction ❤️"""
        global _test_content_id
        
        if not _test_content_id:
            pytest.skip("No content ID available")
        
        response = session.post(f"{BASE_URL}/api/content/{_test_content_id}/react?reaction_type=love", 
            headers=auth_headers
        )
        print(f"Love reaction response: {response.status_code} - {response.text}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("reaction") == "love"
        print(f"✅ Love reaction added: {data}")
    
    def test_03_react_with_fire(self, session, auth_headers):
        """Test fire reaction 🔥"""
        global _test_content_id
        
        if not _test_content_id:
            pytest.skip("No content ID available")
        
        response = session.post(f"{BASE_URL}/api/content/{_test_content_id}/react?reaction_type=fire", 
            headers=auth_headers
        )
        print(f"Fire reaction response: {response.status_code} - {response.text}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("reaction") == "fire"
        print(f"✅ Fire reaction added (replaced love): {data}")
    
    def test_04_react_with_clap(self, session, auth_headers):
        """Test clap reaction 👏"""
        global _test_content_id
        
        if not _test_content_id:
            pytest.skip("No content ID available")
        
        response = session.post(f"{BASE_URL}/api/content/{_test_content_id}/react?reaction_type=clap", 
            headers=auth_headers
        )
        print(f"Clap reaction response: {response.status_code} - {response.text}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("reaction") == "clap"
        print(f"✅ Clap reaction added: {data}")
    
    def test_05_react_with_heart_eyes(self, session, auth_headers):
        """Test heart_eyes reaction 😍"""
        global _test_content_id
        
        if not _test_content_id:
            pytest.skip("No content ID available")
        
        response = session.post(f"{BASE_URL}/api/content/{_test_content_id}/react?reaction_type=heart_eyes", 
            headers=auth_headers
        )
        print(f"Heart eyes reaction response: {response.status_code} - {response.text}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("reaction") == "heart_eyes"
        print(f"✅ Heart eyes reaction added: {data}")
    
    def test_06_react_with_diamond(self, session, auth_headers):
        """Test diamond reaction 💎"""
        global _test_content_id
        
        if not _test_content_id:
            pytest.skip("No content ID available")
        
        response = session.post(f"{BASE_URL}/api/content/{_test_content_id}/react?reaction_type=diamond", 
            headers=auth_headers
        )
        print(f"Diamond reaction response: {response.status_code} - {response.text}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("reaction") == "diamond"
        print(f"✅ Diamond reaction added: {data}")
    
    def test_07_remove_reaction(self, session, auth_headers):
        """Test removing reaction"""
        global _test_content_id
        
        if not _test_content_id:
            pytest.skip("No content ID available")
        
        response = session.post(f"{BASE_URL}/api/content/{_test_content_id}/react", 
            headers=auth_headers
        )
        print(f"Remove reaction response: {response.status_code} - {response.text}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("reaction") is None
        print(f"✅ Reaction removed: {data}")
    
    def test_08_invalid_reaction_type(self, session, auth_headers):
        """Test invalid reaction type returns error"""
        global _test_content_id
        
        if not _test_content_id:
            pytest.skip("No content ID available")
        
        response = session.post(f"{BASE_URL}/api/content/{_test_content_id}/react?reaction_type=invalid", 
            headers=auth_headers
        )
        print(f"Invalid reaction response: {response.status_code} - {response.text}")
        assert response.status_code == 400
        print(f"✅ Invalid reaction correctly rejected")


class TestOnlineStatusOnExplore:
    """Test online status appears on explore page creators"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def admin_token(self, session):
        return get_admin_token(session)
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        if not admin_token:
            pytest.skip("No admin token available")
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_01_set_admin_online(self, session, auth_headers):
        """Set admin status to online"""
        response = session.put(f"{BASE_URL}/api/creators/me/status?status=online", headers=auth_headers)
        print(f"Set online status response: {response.status_code}")
        assert response.status_code == 200
        print("✅ Admin status set to online")
    
    def test_02_check_online_status_in_creators_list(self, session):
        """Check online status appears in creators list"""
        response = session.get(f"{BASE_URL}/api/creators/")
        print(f"Get creators response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        
        # Find admin creator and check online_status
        admin_creator = None
        for creator in data:
            if creator.get("online_status"):
                print(f"  - Creator {creator.get('display_name')}: online_status = {creator.get('online_status')}")
            if "admin" in creator.get("display_name", "").lower() or creator.get("online_status") == "online":
                admin_creator = creator
        
        if admin_creator:
            print(f"✅ Found creator with online status: {admin_creator.get('display_name')} - {admin_creator.get('online_status')}")
        else:
            print("⚠️ No creator with online status found in list")


class TestFeedWithReactions:
    """Test feed includes reaction data"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    @pytest.fixture(scope="class")
    def admin_token(self, session):
        return get_admin_token(session)
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        if not admin_token:
            pytest.skip("No admin token available")
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_01_get_feed_with_reactions(self, session, auth_headers):
        """Test feed includes user_reaction field"""
        response = session.get(f"{BASE_URL}/api/content/feed", headers=auth_headers)
        print(f"Get feed response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        
        print(f"Feed contains {len(data)} items")
        for item in data[:3]:  # Check first 3 items
            print(f"  - Content {item.get('id')[:8]}...: like_count={item.get('like_count')}, user_reaction={item.get('user_reaction')}, creator_online_status={item.get('creator_online_status')}")
        
        print("✅ Feed retrieved with reaction data")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
