# Security Specification for Bauchi Institute Admission Portal

## Data Invariants
1. A user can only see and edit their own User profile (unless Admin).
2. An Applicant can only submit one application or see their own applications.
3. An Admin can see and update status of ALL applications.
4. Applicants CANNOT update their own application status to 'approved'.
5. Documents must be linked to a valid application owned by the user.

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Attempt to create a user profile with a different UID.
2. **Privilege Escalation**: Attempt to set `role: 'admin'` on the user's own profile.
3. **Application Hijacking**: Attempt to read another user's application.
4. **Status Forgery**: Applicant attempting to update their `status` to `approved`.
5. **Orphaned Document**: Attempt to upload a document linked to a non-existent status or another user's application.
6. **Ghost Fields**: Adding `isVerified: true` to an application.
7. **Size Attack**: Sending a 1MB string for `course_applied`.
8. **ID Poisoning**: Using a 2KB string as a `userId`.
9. **Role Modification**: An applicant trying to change their role back to `admin` after creation.
10. **Admin Bypass**: Attempting to list all users without being an admin.
11. **Timestamp Spoofing**: Sending a manual `created_at` from the client.
12. **Cross-User Delete**: Attempting to delete another user's document.

## Test Strategy
The `firestore.rules` will be written to block all the above.
A `firestore.rules.test.ts` would verify these boundaries.
