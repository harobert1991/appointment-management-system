import { routes as providerRoutes } from '../src/modules/provider/provider.routes';
import { routes as appointmentTypeRoutes } from '../src/modules/appointmentType/appointmentType.routes';
import { generatePostmanTests } from '../src/utils/postmanTests';
import path from 'path';

async function main() {
  console.log('📝 Generating Postman tests...');
  
  const allRoutes = [
    ...providerRoutes,
    ...appointmentTypeRoutes
  ];

  // Add cleanup folder at the end
  const cleanupFolder = {
    name: 'Cleanup',
    item: [
      {
        name: 'Delete All AppointmentTypes',
        request: {
          method: 'DELETE',
          header: [],
          url: {
            raw: '{{baseUrl}}/appointment-types/cleanup',
            host: ['{{baseUrl}}'],
            path: ['appointment-types', 'cleanup']
          }
        },
        response: []
      },
      {
        name: 'Delete All Providers',
        request: {
          method: 'DELETE',
          header: [],
          url: {
            raw: '{{baseUrl}}/providers/cleanup',
            host: ['{{baseUrl}}'],
            path: ['providers', 'cleanup']
          }
        },
        response: []
      }
    ]
  };

  const outputPath = path.join(__dirname, '../postman/tests.json');
  await generatePostmanTests(allRoutes, outputPath, 'localhost:3000/api', cleanupFolder);
  
  console.log(`✅ Tests generated at: ${outputPath}`);
}

main().catch(console.error); 