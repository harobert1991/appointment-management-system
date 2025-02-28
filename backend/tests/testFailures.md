Here's a summary of the errors we encountered and their solutions:

Error - Jest Mock Implementation Type
Category: Jest Testing, TypeScript Typing
Why it happened:
Jest's mock implementation expects a function that can handle any arguments (...args: unknown[])
We were trying to use a strictly typed parameter (data: Partial<IAppointmentType>)
Solution:
Use (...args: unknown[]) instead of strictly typed parameters.

Error - Mongoose Filter Query Type
Category: Mongoose, TypeScript Typing
Why it happened:
We were using Partial<IAppointmentType> for MongoDB queries.
Mongoose needs FilterQuery<T> type because MongoDB queries can include operators ($gt, $lt, $or, etc.)
Partial<T> only allows simple object properties.
Solution:
Use FilterQuery<IAppointmentType> for Mongoose queries.

Error - TypeScript Validation in Tests
Category: TypeScript Typing, Test Validation
Why it happened:
TypeScript is correctly enforcing the type requirements from our schema. In the test case for "missing location name", we tried to omit the required name property to test validation.
Problem:
TypeScript won't let us create an object missing required properties.
Solution:
Use an empty string instead of omitting the property.
Learning:
When testing invalid data in TypeScript:
- Can't omit required properties due to type checking.
- Instead, use invalid values (empty strings, null, etc.) that will trigger validation.
The validation itself happens in Mongoose/MongoDB, not in TypeScript. This is a common challenge when testing validation in TypeScript - we need to find ways to create "invalid" data while still satisfying the TypeScript compiler.

Error - Mock Timestamp Issue
Category: Jest Testing, Data Mocking
Why it happened:
The error occurs because our mock is using the same timestamp for both the original and updated appointment.
Solution:
- Store the original updatedAt timestamp.
- Create a new timestamp by adding 1 second.
- Use the new timestamp in the mock response.
This ensures the updatedAt timestamp is always different in the updated document, which is what we're testing for.

Error - Type Assertion to Bypass Type Checking
Category: TypeScript Typing, Test Validation
Why it happened:
This error is similar to the previous TypeScript validation error. The issue is that we're trying to test invalid data (missing the required name field), but TypeScript won't let us create an object that violates the type definition.
What's happening:
- In our schema, name is required for location objects.
- We're trying to create invalid test data without a name.
- TypeScript is preventing this at compile time.
Solution:
Use type assertion with `as Partial<IAppointmentType>` to bypass TypeScript's strict type checking during test cases.

Error - TypeScript Null/Undefined Checking
Category: TypeScript Typing, Null Safety
Why it happened:
This error is about TypeScript's null/undefined checking. Since we're accessing array elements that might not exist (`locations[0]` and `locations[1]`), TypeScript warns us that these locations might be undefined.
Solution:
- Add validation checks to ensure `locations` is defined before accessing its elements.
- Example fix:
  ```typescript
  expect(updatedAppointment?.locations).toBeDefined();
  expect(locations).toBeDefined();

  const [physicalLocation, virtualLocation] = locations;
  expect(physicalLocation).toBeDefined();
  expect(virtualLocation).toBeDefined();
  ```
This ensures TypeScript knows the values exist before accessing their properties.
