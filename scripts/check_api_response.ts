// Using global fetch available in Node.js 18+

const API_URL = 'http://localhost:3012/api'; // Backend server port

async function checkApiResponse() {
  try {
    console.log('Fetching entities from API...');
    const response = await fetch(`${API_URL}/entities?limit=1`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      const person = data.data[0];
      console.log('Person:', person.fullName || person.name);
      
      if (person.fileReferences) {
        console.log('fileReferences type:', typeof person.fileReferences);
        if (Array.isArray(person.fileReferences)) {
          console.log('fileReferences length:', person.fileReferences.length);
          if (person.fileReferences.length > 0) {
            console.log('First fileReference:', JSON.stringify(person.fileReferences[0], null, 2));
            
            if (!person.fileReferences[0].id) {
              console.error('CRITICAL: fileReference is missing "id" property!');
            } else {
              console.log('fileReference has "id":', person.fileReferences[0].id);
            }
          }
        } else {
          console.log('fileReferences is NOT an array:', person.fileReferences);
        }
      } else {
        console.log('Person has no fileReferences');
      }
    } else {
      console.log('No entities returned');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkApiResponse();
