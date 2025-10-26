// Simple test to check what's happening with RBAC
console.log('Testing RBAC system...');

// Check what happens when we try to get user permissions
fetch('/api/admin/rbac/users/18/permissions')
  .then(response => {
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    return response.json();
  })
  .then(data => {
    console.log('Response data:', data);
  })
  .catch(error => {
    console.error('Error:', error);
  });