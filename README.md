# Node-starter-template-v2

1. Config - You can add your all configuation and external settings in this
    - contains the validation and logic to export the env variables
    - contains the loggers to handle custom logs, errors or exceptions etc occuring throughout the codebase be it internal or your own logs

2. Constants - contains the constant variables that could be types, options that are used in different models, validations, controllers etc

3. Controllers - contains the function that takes over the request once its validated & authenticated by the middlewares. This is the place where you ensure all the checks/errorHandling, data manipulation/extraction & prepartion of data which will be required by the services.

4. Microservices - contains the 3rd party services for example, notifications, fileUpload, sms etc. 

5. Middlewares - contains the function that are used for validation, authentication, or handling the errors thrown by any service, controller or other functions.

6. Models - Contains the schema of collections and plugins which can be integrated into schema
  - for example: we have paginate plugin that supports - pagination, filtering, sorting, ordering, location search, population 

7. routes - contains versions of all api(s) routes. In initial setup you will have all routes starting from v1 later on you can upgrade.

8. services - contains the function that interacts with Database to do the CRUD operations. Since we are not using Typescript in this templates. It's highly recommended that you handle all your exception and checks in the respective controller before interacting with any service. Services are purely for performing CRUD ops, period.

9. utils - contains the utility functions that you use all across the codebase.

10. validations - contains the validation schemas for each api. Its again highly recommended that if we are not writing test cases then please maintain validators so that we can avoid unnecessary edge cases or wrong request. First thing that we do is validate the request then move to authentication, period. 

- app.js - contains  the configuration of your server

- index.js - boot up script

**Before You Start**
- You have to save the .env file locally with required variables mentioned in config/config.js
- If you don't use any or specific microservice then please remove their validation & cancel their export from config/config.js, otherwise app won't run.

_Codebase should be like a graden where everyone can move around easily and peacefully._

**_HAPPY CODING..._**

## HIPAA Compliance Checklist

- [x] Authentication and access control (Firebase Auth, role-based)
- [x] Audit logging (HIPAA logger, 7-year retention)
- [x] Input validation (Joi)
- [x] Error handling (centralized, no sensitive data leaks)
- [x] CORS and security headers (Helmet, custom CSP)
- [x] Encryption at rest (AES-256-CBC for PHI)
- [x] Logging (Winston, Morgan)
- [x] Rate limiting (express-rate-limit)
- [x] CSRF protection (csurf)
- [x] HTTPS enforcement (middleware + deploy config)

**Operational/Organizational Requirements:**
- [ ] **Business Associate Agreements (BAA):** Ensure BAAs are signed with all third-party vendors (Firebase, AWS, SendGrid, etc.)
- [ ] **Data Backup & Disaster Recovery:** Ensure automated, secure backups and a documented recovery plan for all PHI data.
- [ ] **Employee Training & Policies:** All staff must be trained on HIPAA and your organization must have written policies and procedures.

**Note:**
- Some requirements (BAA, backups, training) are not enforceable in code and must be handled by your organization.
- Always deploy with HTTPS enabled and monitor for new vulnerabilities in dependencies.
