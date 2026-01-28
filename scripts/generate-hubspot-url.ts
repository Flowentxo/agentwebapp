
import { hubspotOAuthService } from '../server/services/HubSpotOAuthService';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

async function main() {
  try {
    const userId = 'demo-user'; // fallback user
    console.log('Generating URL for userId:', userId);
    console.log('HubSpot Client ID:', process.env.HUBSPOT_CLIENT_ID);
    
    // We need to mock the DB config check if it's not set, but the service now has fallback
    const url = await hubspotOAuthService.getAuthUrl(userId);
    console.log('\n--- AUTH URL ---\n');
    console.log(url);
    console.log('\n----------------\n');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
