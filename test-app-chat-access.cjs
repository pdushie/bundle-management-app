const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function testChatAccess() {
  console.log('Testing chat access by attempting to visit the chat page...');
  
  try {
    // Try to access the chat page directly
    const { stdout, stderr } = await execAsync('curl -L -k "http://localhost:3000/admin/chat" -H "User-Agent: Mozilla/5.0"');
    
    console.log('\n=== Response ===');
    if (stdout.includes('You don\'t have permission to access this page')) {
      console.log('❌ Permission denied message found in response');
    } else if (stdout.includes('Sign in to Clickyfied')) {
      console.log('🔄 Redirected to sign-in page (not authenticated)');
    } else if (stdout.includes('Chat Support') || stdout.includes('chat')) {
      console.log('✅ Chat page loaded successfully');
    } else {
      console.log('❓ Unexpected response');
    }
    
    // Check if it's a redirect
    if (stdout.includes('302') || stdout.includes('Location:')) {
      console.log('🔄 Response includes redirect');
    }
    
  } catch (error) {
    console.error('Error testing chat access:', error.message);
  }
}

testChatAccess();