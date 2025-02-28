import { RouteConfig } from './routeLoader';
import fs from 'fs/promises';

interface PostmanTest {
  info: {
    name: string;
    schema: string;
  };
  item: (PostmanItem | PostmanFolder)[];  // Allow both types
  variable?: Array<{
    key: string;
    value: string;
    type: string;
  }>;
}

interface PostmanItem {
  name: string;
  request: {
    method: string;
    header: { key: string; value: string }[];
    url: { raw: string; host: string[]; path: string[] };
    body?: { mode: string; raw: string };
  };
  response: any[];
  event: {
    listen: string;
    script: {
      type: string;
      exec: string[];
    };
  }[];
}

interface PostmanFolder {
  name: string;
  item: {
    name: string;
    request: {
      method: string;
      header: any[];
      url: {
        raw: string;
        host: string[];
        path: string[];
      };
    };
    response: any[];
  }[];
}

interface TestFlow {
  name: string;
  steps: TestStep[];
}

interface TestStep {
  name: string;
  request: RouteConfig;
  variables?: {
    from: string;  // JSON path in response
    to: string;    // Variable name to store
  }[];
  data?: any;      // Custom request data
  dependencies?: string[];  // Variable names this step depends on
}

export async function generatePostmanTests(
  routes: RouteConfig[],
  outputPath: string,
  baseUrl = 'localhost:3000/api',
  cleanupFolder?: PostmanFolder
): Promise<void> {
  const flows: TestFlow[] = [
    {
      name: "Provider Creation Flow",
      steps: [
        {
          name: "Create First Appointment Type",
          request: routes.find(r => r.path === '/appointment-types' && r.method === 'post')!,
          variables: [{ 
            from: "data._id",
            to: "firstAppointmentTypeId"
          }],
          data: {
            name: "Service Type 1",
            duration: 60,
            description: "First service type",
            price: 100
          }
        },
        {
          name: "Create Second Appointment Type",
          request: routes.find(r => r.path === '/appointment-types' && r.method === 'post')!,
          variables: [{ 
            from: "data._id",
            to: "secondAppointmentTypeId"
          }],
          data: {
            name: "Service Type 2",
            duration: 30,
            description: "Second service type",
            price: 50
          }
        },
        {
          name: "Create Provider with Created Services",
          request: routes.find(r => r.path === '/providers' && r.method === 'post')!,
          dependencies: ["firstAppointmentTypeId", "secondAppointmentTypeId"],
          data: {
            servicesOffered: ["{{firstAppointmentTypeId}}", "{{secondAppointmentTypeId}}"],
            availability: [{
              dayOfWeek: "Monday",
              timeSlots: [{
                startTime: "09:00",
                endTime: "17:00",
                requiresTravelTime: false,
                spansOvernight: false
              }],
              isRecurring: true
            }],
            user: {
              email: "provider@example.com",
              firstName: "John",
              lastName: "Doe",
              phone: "+1234567890",
              password: "securePassword123"
            }
          }
        }
      ]
    }
  ];

  const postmanCollection: PostmanTest = {
    info: {
      name: "API Integration Tests",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: [],
    variable: [
      {
        key: "baseUrl",
        value: baseUrl,
        type: "string"
      }
    ]
  };

  flows.forEach(flow => {
    const flowFolder: PostmanFolder = {
      name: flow.name,
      item: flow.steps.map(step => createTestItem(step))
    };
    postmanCollection.item.push(flowFolder);
  });

  // Add cleanup folder if provided
  if (cleanupFolder) {
    postmanCollection.item.push(cleanupFolder);
  }

  await fs.writeFile(outputPath, JSON.stringify(postmanCollection, null, 2));
}

function createTestItem(step: TestStep): PostmanItem {
  const item: PostmanItem = {
    name: step.name,
    request: {
      method: step.request.method.toUpperCase(),
      header: [
        {
          key: "Content-Type",
          value: "application/json"
        }
      ],
      url: {
        raw: `{{baseUrl}}${step.request.path}`,
        host: ["{{baseUrl}}"],
        path: step.request.path.split('/').filter(p => p)
      }
    },
    response: [],
    event: [{
      listen: "test",
      script: {
        type: "text/javascript",
        exec: generateIntegrationTestScript(step)
      }
    }]
  };

  if (step.data) {
    item.request.body = {
      mode: "raw",
      raw: JSON.stringify(step.data, null, 2)
    };
  }

  return item;
}

function generateIntegrationTestScript(step: TestStep): string[] {
  const tests = [
    "pm.test('Status code is successful', function () {",
    "    pm.response.to.have.status(201);",
    "});",
    "",
    "pm.test('Response has correct structure', function () {",
    "    const responseData = pm.response.json();",
    "    pm.expect(responseData).to.have.property('success', true);",
    "    pm.expect(responseData).to.have.property('data');",
    "});"
  ];

  // Add variable storage
  if (step.variables) {
    step.variables.forEach(variable => {
      tests.push(
        "",
        `// Store ${variable.to} for later use`,
        "const responseData = pm.response.json();",
        `pm.collectionVariables.set('${variable.to}', responseData.${variable.from});`,
        `console.log('Stored ${variable.to}:', pm.collectionVariables.get('${variable.to}'));`
      );
    });
  }

  // Add dependency checks
  if (step.dependencies) {
    tests.unshift(
      "// Check required variables",
      ...step.dependencies.map(dep => 
        `pm.expect(pm.collectionVariables.get('${dep}')).to.exist;`
      ),
      ""
    );
  }

  return tests;
}

function generateTestScript(route: RouteConfig): string[] {
  const tests = [
    "pm.test('Status code is 201', function () {",
    "    pm.response.to.have.status(201);",
    "});",
    "",
    "pm.test('Response has correct structure', function () {",
    "    const responseData = pm.response.json();",
    "    pm.expect(responseData).to.have.property('success', true);",
    "    pm.expect(responseData).to.have.property('data');",
    "    pm.expect(responseData.data).to.have.property('provider');",
    "    pm.expect(responseData.data).to.have.property('user');",
    "});",
    "",
    "pm.test('Provider has required fields', function () {",
    "    const provider = pm.response.json().data.provider;",
    "    pm.expect(provider).to.have.property('userId');",
    "    pm.expect(provider).to.have.property('servicesOffered');",
    "});",
    "",
    "pm.test('User has required fields', function () {",
    "    const user = pm.response.json().data.user;",
    "    pm.expect(user).to.have.property('email');",
    "    pm.expect(user).to.have.property('firstName');",
    "    pm.expect(user).to.have.property('lastName');",
    "    pm.expect(user).to.have.property('role', 'provider');",
    "});"
  ];

  // Add error response tests
  route.errorResponses?.forEach(error => {
    tests.push(
      ``,
      `// Test ${error.description}`,
      `// Requires separate request with invalid data`,
      `/*`,
      `pm.test('${error.description}', function () {`,
      `    pm.response.to.have.status(${error.status});`,
      `    const responseData = pm.response.json();`,
      `    pm.expect(responseData.success).to.be.false;`,
      `    pm.expect(responseData.error).to.exist;`,
      `});`,
      `*/`
    );
  });

  return tests;
}

function generateSampleRequestBody(schema: any): any {
  const sampleProvider = {
    servicesOffered: ["service1", "service2"],
    availability: [{
      dayOfWeek: "Monday",
      timeSlots: [{
        startTime: "09:00",
        endTime: "17:00",
        requiresTravelTime: false,
        spansOvernight: false
      }],
      isRecurring: true
    }],
    user: {
      email: "provider@example.com",
      firstName: "John",
      lastName: "Doe",
      phone: "+1234567890",
      password: "securePassword123"
    }
  };

  return sampleProvider;
} 