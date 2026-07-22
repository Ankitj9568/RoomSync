# 📄 API.md — REST API Specification

## Overview

RoomSync exposes a RESTful API for managing shared household activities such as expenses, groceries, shopping lists, meals, settlements, and analytics.

All endpoints exchange data using JSON.

**Base URL**

```
/api
```

---

## Authentication

RoomSync uses **session-based authentication** with `express-session`.

All protected endpoints require a valid authenticated session.

Session cookies are configured as:

- `HttpOnly`
- `SameSite=Strict`
- `Secure` (Production)

Public endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`

---

## Group Context

RoomSync supports **multiple groups per user**.

The backend **does not maintain an active group**.

The frontend is responsible for storing the currently selected group (React Context / Local Storage).

Every group-specific request must explicitly specify the target group through either:

- Path Parameter (`/groups/:id`)
- Query Parameter (`group_id`)
- Request Body (`group_id`)

---

# Auth Module

## POST `/api/auth/register`

### Purpose

Register a new user.

### Authorization

Public

### Request

```json
{
  "name": "Ankit",
  "email": "ankit@gmail.com",
  "password": "password123"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "name": "Ankit",
    "email": "ankit@gmail.com"
  }
}
```

### Status Codes

- 201 Created
- 400 Bad Request
- 409 Conflict

### Validation

- Name is required
- Email must be valid
- Email must be unique
- Password minimum 6 characters

### Errors

- EMAIL_ALREADY_EXISTS
- INVALID_EMAIL_FORMAT
- WEAK_PASSWORD

---

## POST `/api/auth/login`

### Purpose

Authenticate a user and create a session.

### Authorization

Public

### Request

```json
{
  "email": "ankit@gmail.com",
  "password": "password123"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "name": "Ankit",
    "email": "ankit@gmail.com"
  }
}
```

### Status Codes

- 200 OK
- 400 Bad Request
- 401 Unauthorized

### Validation

- Email required
- Password required

### Errors

- INVALID_CREDENTIALS

---

## POST `/api/auth/logout`

### Purpose

Destroy the authenticated session.

### Authorization

Authenticated User

### Response

```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

### Status Codes

- 200 OK
- 401 Unauthorized

---

# Users Module

## GET `/api/users/me`

### Purpose

Retrieve the authenticated user's profile.

### Authorization

Authenticated User

### Response

```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "name": "Ankit",
    "email": "ankit@gmail.com",
    "phone": "9876543210",
    "upi_id": "ankit@oksbi"
  }
}
```

### Status Codes

- 200 OK
- 401 Unauthorized

### Errors

- UNAUTHORIZED

---

## PUT `/api/users/me`

### Purpose

Update the authenticated user's profile.

### Authorization

Authenticated User

### Request

```json
{
  "name": "Ankit Kumar",
  "phone": "9876543210",
  "upi_id": "ankit@oksbi"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "name": "Ankit Kumar",
    "phone": "9876543210",
    "upi_id": "ankit@oksbi"
  }
}
```

### Status Codes

- 200 OK
- 400 Bad Request
- 401 Unauthorized

### Validation

- Name required
- Phone must contain exactly 10 digits
- UPI ID must follow `<handle>@<provider>`

### Errors

- INVALID_PHONE_FORMAT
- INVALID_UPI_FORMAT
- UNAUTHORIZED

---

# Groups Module

## GET `/api/groups`

### Purpose

Retrieve all groups joined by the authenticated user.

### Authorization

Authenticated User

### Response

```json
{
  "success": true,
  "data": [
    {
      "group_id": 1,
      "group_name": "Flat 302",
      "group_code": "AB12CD",
      "member_count": 5,
      "role": "admin"
    },
    {
      "group_id": 3,
      "group_name": "Hostel",
      "group_code": "PQ8L2M",
      "member_count": 4,
      "role": "member"
    }
  ]
}
```

### Status Codes

- 200 OK
- 401 Unauthorized

### Errors

- UNAUTHORIZED

---

## POST `/api/groups`

### Purpose

Create a new group.

The creator automatically becomes the administrator and a default `group_settings` record is created.

### Authorization

Authenticated User

### Request

```json
{
  "group_name": "Flat 302"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "group_id": 1,
    "group_name": "Flat 302",
    "group_code": "AB12CD"
  }
}
```

### Status Codes

- 201 Created
- 400 Bad Request
- 401 Unauthorized

### Validation

- Group name required
- Length between 2 and 100 characters

### Errors

- UNAUTHORIZED

---

## GET `/api/groups/:id`

### Purpose

Retrieve complete information about a group.

### Authorization

Any Group Member

### Response

```json
{
  "success": true,
  "data": {
    "group_id": 1,
    "group_name": "Flat 302",
    "group_code": "AB12CD",
    "member_count": 5,
    "members": [
      {
        "user_id": 1,
        "name": "Ankit",
        "role": "admin"
      }
    ]
  }
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER
- GROUP_NOT_FOUND

---

## POST `/api/groups/join`

### Purpose

Join a group using its invitation code.

### Authorization

Authenticated User

### Request

```json
{
  "group_code": "AB12CD"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "group_id": 1,
    "group_name": "Flat 302"
  }
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 404 Not Found
- 409 Conflict

### Validation

- Group code required
- Case-insensitive
- 6–10 alphanumeric characters

### Business Rules

- User may belong to multiple groups.
- Joined users are assigned the `member` role by default.
- Duplicate memberships are prevented by:
  - API validation
  - Database constraint `UNIQUE(group_id, user_id)`

### Errors

- UNAUTHORIZED
- GROUP_NOT_FOUND
- ALREADY_A_MEMBER
- INVALID_GROUP_CODE

## DELETE `/api/groups/:id`

### Purpose

Delete the group and all associated data.

### Authorization

Group Administrator Only

### Response

```json
{
  "success": true,
  "message": "Group deleted successfully."
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

### Validation

- The requesting user must be an administrator of the group.
- The group must exist.

### Business Rules

- Only group administrators may delete a group.
- A group can only be deleted when it contains exactly one member.
- The last remaining member must delete the group instead of leaving.
- Deleting a group cascades deletion to all dependent records, including:
  - Group members
  - Group settings
  - Groceries
  - Shopping list items
  - Meals
  - Expenses
  - Expense members
  - Payments
  - Adjustments
- This operation is irreversible.

### Errors

- UNAUTHORIZED
- NOT_ADMIN
- GROUP_NOT_FOUND
- GROUP_NOT_EMPTY


# Group Members Module

## GET `/api/groups/:id/members`

### Purpose

Retrieve all members of the specified group.

### Authorization

Any Group Member

### Response

```json
{
  "success": true,
  "data": [
    {
      "user_id": 1,
      "name": "Ankit",
      "email": "ankit@gmail.com",
      "phone": "9876543210",
      "upi_id": "ankit@oksbi",
      "role": "admin",
      "joined_at": "2026-07-01T10:15:30Z"
    },
    {
      "user_id": 2,
      "name": "Rahul",
      "email": "rahul@gmail.com",
      "phone": "9876543211",
      "upi_id": "rahul@ybl",
      "role": "member",
      "joined_at": "2026-07-03T15:20:10Z"
    }
  ]
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

### Business Rules

- Only members of the group can view the member list.

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER
- GROUP_NOT_FOUND

---

## DELETE `/api/groups/:id/members/:userId`

### Purpose

Remove a member from the specified group.

### Authorization

Group Administrator Only

### Response

```json
{
  "success": true,
  "message": "Member removed successfully."
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

### Validation

- Target user must belong to the group.

### Business Rules

- Administrators cannot remove themselves using this endpoint.
- Administrators must use the Leave Group endpoint instead.
- The last remaining member cannot be removed.

### Errors

- UNAUTHORIZED
- NOT_ADMIN
- MEMBER_NOT_FOUND
- GROUP_NOT_FOUND
- CANNOT_REMOVE_LAST_MEMBER

---

## POST `/api/groups/:id/leave`

### Purpose

Allow the authenticated user to leave a group.

### Authorization

Any Group Member

### Response

```json
{
  "success": true,
  "message": "Left group successfully."
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict

### Business Rules

- Any member may leave voluntarily.
- If the leaving member is the only administrator and other members remain, administrator ownership is automatically transferred to the longest-standing member.
- The last remaining member cannot leave.
- The last remaining member must delete the group instead.

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER
- GROUP_NOT_FOUND
- CANNOT_LEAVE_LAST_MEMBER

---

# Group Settings Module

## GET `/api/groups/:id/settings`

### Purpose

Retrieve the configuration settings of a group.

### Authorization

Any Group Member

### Response

```json
{
  "success": true,
  "data": {
    "meal_cutoff_time": "10:00:00"
  }
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER
- GROUP_NOT_FOUND

---

## PUT `/api/groups/:id/settings`

### Purpose

Update the configurable settings of a group.

### Authorization

Group Administrator Only

### Request

```json
{
  "meal_cutoff_time": "09:30:00"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "meal_cutoff_time": "09:30:00"
  }
}
```

### Status Codes

- 200 OK
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

### Validation

- Meal cutoff time must follow `HH:MM:SS`.

### Business Rules

- The configured cutoff time applies to all members of the group.
- Meal attendance cannot be modified after the cutoff time.

### Errors

- UNAUTHORIZED
- NOT_ADMIN
- GROUP_NOT_FOUND
- INVALID_TIME_FORMAT

---

# Groceries Module

## GET `/api/groceries?group_id=`

### Purpose

Retrieve all grocery purchases for the specified group.

### Authorization

Any Group Member

### Response

```json
{
  "success": true,
  "data": [
    {
      "grocery_id": 1,
      "item_name": "Rice",
      "quantity": "5 kg",
      "amount": 350,
      "purchased_by": 2,
      "purchase_date": "2026-07-22"
    }
  ]
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden

### Validation

- `group_id` is required.

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER

---

## POST `/api/groceries`

### Purpose

Record a grocery purchase.

### Authorization

Any Group Member

### Request

```json
{
  "group_id": 1,
  "item_name": "Rice",
  "quantity": "5 kg",
  "amount": 350,
  "purchase_date": "2026-07-22"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "grocery_id": 1
  }
}
```

### Status Codes

- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden

### Validation

- Item name required.
- Amount must be greater than zero.
- Purchase date cannot be in the future.

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER

---

## PUT `/api/groceries/:id`

### Purpose

Update an existing grocery purchase.

### Authorization

Resource Creator Only

### Request

```json
{
  "item_name": "Rice",
  "quantity": "10 kg",
  "amount": 700
}
```

### Response

```json
{
  "success": true,
  "message": "Grocery updated successfully."
}
```

### Status Codes

- 200 OK
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

### Validation

- Amount must remain greater than zero.

### Business Rules

- Only the original purchaser may edit.
- Editing is allowed only until **11:59 PM (server timezone)** on the purchase date.

### Errors

- UNAUTHORIZED
- NOT_PURCHASER
- CORRECTION_WINDOW_EXPIRED
- GROCERY_NOT_FOUND

---

## DELETE `/api/groceries/:id`

### Purpose

Delete a grocery purchase.

### Authorization

Resource Creator Only

### Response

```json
{
  "success": true,
  "message": "Grocery deleted successfully."
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

### Business Rules

- Only the original purchaser may delete.
- Deletion is allowed only until **11:59 PM (server timezone)** on the purchase date.

### Errors

- UNAUTHORIZED
- NOT_PURCHASER
- CORRECTION_WINDOW_EXPIRED
- GROCERY_NOT_FOUND

---

# Shopping List Module

## GET `/api/shopping-list?group_id=`

### Purpose

Retrieve all shopping list items for the specified group.

### Authorization

Any Group Member

### Response

```json
{
  "success": true,
  "data": [
    {
      "item_id": 1,
      "item_name": "Milk",
      "assigned_to": 2,
      "status": "pending"
    }
  ]
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden

### Validation

- `group_id` is required.

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER

---

## POST `/api/shopping-list`

### Purpose

Create a shopping list item.

### Authorization

Any Group Member

### Request

```json
{
  "group_id": 1,
  "item_name": "Milk",
  "assigned_to": 2
}
```

### Response

```json
{
  "success": true,
  "data": {
    "item_id": 1
  }
}
```

### Status Codes

- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden

### Validation

- Item name required.
- Assigned member must belong to the group.

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER
- MEMBER_NOT_FOUND

---

## PUT `/api/shopping-list/:id`

### Purpose

Update a shopping list item.

### Authorization

Any Group Member

### Request

```json
{
  "status": "purchased",
  "assigned_to": 3
}
```

### Response

```json
{
  "success": true,
  "message": "Shopping item updated successfully."
}
```

### Status Codes

- 200 OK
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

### Validation

- Status must be either:
  - `pending`
  - `purchased`
- Assigned member must belong to the group.

### Business Rules

- Shopping lists are collaborative resources.
- Any member of the group may update shopping items.

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER
- MEMBER_NOT_FOUND
- SHOPPING_ITEM_NOT_FOUND

---

## DELETE `/api/shopping-list/:id`

### Purpose

Delete a shopping list item.

### Authorization

Any Group Member

### Response

```json
{
  "success": true,
  "message": "Shopping item deleted successfully."
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

### Business Rules

- Shopping lists are collaborative resources.
- Any member of the group may delete shopping items.

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER
- SHOPPING_ITEM_NOT_FOUND

---

# Meals Module

## GET `/api/meals?group_id=&meal_date=`

### Purpose

Retrieve meal attendance for a specific group and date.

### Authorization

Any Group Member

### Response

```json
{
  "success": true,
  "data": [
    {
      "user_id": 1,
      "name": "Ankit",
      "lunch": true,
      "dinner": false
    }
  ]
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden

### Validation

- `group_id` is required.
- meal_date is required.

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER

---

## POST `/api/meals`

### Purpose

Submit meal attendance.

### Authorization

Any Group Member

### Request

```json
{
  "group_id": 1,
  "meal_date": "2026-07-22",
  "meal_type": "lunch",
  "is_attending": true
}
```

### Response

```json
{
  "success": true,
  "message": "Meal preference recorded successfully."
}
```

### Status Codes

- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden

### Validation

- Meal type must be one of:
  - `lunch`
  - `dinner`
- Meal date cannot be in the past.

### Business Rules

- Meal attendance can only be modified before the configured cutoff time.
- Cutoff evaluation uses the server timezone.

### Errors

- UNAUTHORIZED
- CUTOFF_PASSED

---

## PUT `/api/meals/:id`

### Purpose

Update meal attendance.

### Authorization

Any Group Member

### Request

```json
{
  "is_attending": false
}
```

### Response

```json
{
  "success": true,
  "message": "Meal preference updated successfully."
}
```

### Status Codes

- 200 OK
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

### Business Rules

- Updates are allowed only before the configured meal cutoff time.
- Cutoff evaluation uses the server timezone.

### Errors

- UNAUTHORIZED
- CUTOFF_PASSED
- MEAL_NOT_FOUND

---

# Expenses Module

## GET `/api/expenses?group_id=`

### Purpose

Retrieve all expenses recorded for the specified group.

### Authorization

Any Group Member

### Response

```json
{
  "success": true,
  "data": [
    {
      "expense_id": 1,
      "title": "Electricity Bill",
      "amount": 2500,
      "paid_by": {
        "user_id": 2,
        "name": "Rahul"
      },
      "split_type": "equal",
      "expense_date": "2026-07-22",
      "created_at": "2026-07-22T18:30:15Z"
    }
  ]
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden

### Validation

- `group_id` is required.

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER

---

## GET `/api/expenses/:id`

### Purpose

Retrieve complete details of a specific expense.

### Authorization

Any Group Member

### Response

```json
{
  "success": true,
  "data": {
    "expense_id": 1,
    "title": "Electricity Bill",
    "description": "July Electricity Bill",
    "amount": 2500,
    "paid_by": {
      "user_id": 2,
      "name": "Rahul"
    },
    "split_type": "equal",
    "expense_date": "2026-07-22",
    "members": [
      {
        "user_id": 1,
        "name": "Ankit",
        "share_amount": 625
      },
      {
        "user_id": 2,
        "name": "Rahul",
        "share_amount": 625
      },
      {
        "user_id": 3,
        "name": "Arnab",
        "share_amount": 625
      },
      {
        "user_id": 4,
        "name": "Abdul",
        "share_amount": 625
      }
    ]
  }
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER
- EXPENSE_NOT_FOUND

---

## POST `/api/expenses`

### Purpose

Create a new shared expense.

### Authorization

Any Group Member

### Request

```json
{
  "group_id": 1,
  "title": "Electricity Bill",
  "description": "July Electricity Bill",
  "amount": 2500,
  "paid_by": 2,
  "split_type": "equal",
  "expense_date": "2026-07-22",
  "members": [
    1,
    2,
    3,
    4
  ]
}
```

### Response

```json
{
  "success": true,
  "data": {
    "expense_id": 1
  }
}
```

### Status Codes

- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden

### Validation

- `group_id` is required.
- Title is required.
- Amount must be greater than zero.
- Payer must belong to the group.
- Expense date cannot be in the future.
- Split type must be one of:
  - `equal`
  - `custom`
- At least one participating member is required.
- Every participating member must belong to the group.

### Business Rules

- The authenticated user becomes the creator of the expense.
- Expense shares are calculated equally among all participating members.
- Settlement balances are automatically recalculated after expense creation.

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER
- MEMBER_NOT_FOUND
- INVALID_SPLIT_TYPE

---

## PUT `/api/expenses/:id`

### Purpose

Update an existing expense.

### Authorization

Resource Creator Only

### Request

```json
{
  "title": "Updated Electricity Bill",
  "amount": 2600,
  "members": [
    1,
    2,
    3,
    4
  ]
}
```

### Response

```json
{
  "success": true,
  "message": "Expense updated successfully."
}
```

### Status Codes

- 200 OK
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

### Validation

- Amount must remain greater than zero.
- Every participating member must belong to the group.

### Business Rules

- Only the creator of the expense may update it.
- Settlement balances are automatically recalculated after every update.

### Errors

- UNAUTHORIZED
- NOT_EXPENSE_CREATOR
- MEMBER_NOT_FOUND
- EXPENSE_NOT_FOUND

---

## DELETE `/api/expenses/:id`

### Purpose

Delete an expense.

### Authorization

Resource Creator Only

### Response

```json
{
  "success": true,
  "message": "Expense deleted successfully."
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

### Business Rules

- Only the creator of the expense may delete it.
- Settlement balances are automatically recalculated after deletion.

### Errors

- UNAUTHORIZED
- NOT_EXPENSE_CREATOR
- EXPENSE_NOT_FOUND

---

# Payments Module

## GET `/api/payments?group_id=`

### Purpose

Retrieve all payment transactions for the specified group.

### Authorization

Any Group Member

### Response

```json
{
  "success": true,
  "data": [
    {
      "payment_id": 1,
      "payer": "Ankit",
      "receiver": "Rahul",
      "amount": 1200,
      "payment_date": "2026-07-22",
      "payment_mode": "upi"
    }
  ]
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden

### Validation

- `group_id` is required.

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER

---

## POST `/api/payments`

### Purpose

Record a settlement payment between two members.

### Authorization

Any Group Member

### Request

```json
{
  "group_id": 1,
  "payer_id": 1,
  "receiver_id": 2,
  "amount": 1200,
  "payment_mode": "upi",
  "payment_date": "2026-07-22"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "payment_id": 1
  }
}
```

### Status Codes

- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden

### Validation

- Amount must be greater than zero.
- Payer must belong to the group.
- Receiver must belong to the group.
- Payer and receiver cannot be the same member.
- The authenticated user must be the payer or a group administrator.
- Payment mode must be one of:
  - `cash`
  - `upi`
- Payment date cannot be in the future.

### Business Rules

- Recording a payment automatically recalculates settlement balances.

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER
- MEMBER_NOT_FOUND
- INVALID_PAYMENT_MODE
- INVALID_PAYMENT

---

## DELETE `/api/payments/:id`

### Purpose

Delete a recorded payment.

### Authorization

Resource Creator Only

### Response

```json
{
  "success": true,
  "message": "Payment deleted successfully."
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

### Business Rules

- Only the creator of the payment record may delete it.
- Settlement balances are automatically recalculated after deletion.

### Errors

- UNAUTHORIZED
- NOT_PAYMENT_CREATOR
- PAYMENT_NOT_FOUND

---

# Adjustments Module

## GET `/api/adjustments?group_id=`

### Purpose

Retrieve all manual balance adjustments for the specified group.

### Authorization

Group Administrator Only

### Response

```json
{
  "success": true,
  "data": [
    {
      "adjustment_id": 1,
      "member": "Rahul",
      "amount": -250,
      "reason": "Previous month carry forward",
      "created_at": "2026-07-22T11:15:30Z"
    }
  ]
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden

### Validation

- `group_id` is required.

### Errors

- UNAUTHORIZED
- NOT_ADMIN

---

## POST `/api/adjustments`

### Purpose

Create a manual balance adjustment.

### Authorization

Group Administrator Only

### Request

```json
{
  "group_id": 1,
  "user_id": 2,
  "amount": -250,
  "reason": "Previous month carry forward"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "adjustment_id": 1
  }
}
```

### Status Codes

- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden

### Validation

- User must belong to the group.
- Amount cannot be zero.
- Reason is required.
- Reason must not exceed 255 characters.

### Business Rules

- Only group administrators may create manual adjustments.
- Every adjustment is permanently recorded for audit purposes.
- Settlement balances are automatically recalculated after adjustment creation.

### Errors

- UNAUTHORIZED
- NOT_ADMIN
- MEMBER_NOT_FOUND

---

## DELETE `/api/adjustments/:id`

### Purpose

Delete a manual adjustment.

### Authorization

Group Administrator Only

### Response

```json
{
  "success": true,
  "message": "Adjustment deleted successfully."
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

### Business Rules

- Only group administrators may delete adjustments.
- Settlement balances are automatically recalculated after deletion.

### Errors

- UNAUTHORIZED
- NOT_ADMIN
- ADJUSTMENT_NOT_FOUND

---

---

# Dashboard Module

## GET `/api/dashboard?group_id=`

### Purpose

Retrieve the dashboard summary for the specified group.

### Authorization

Any Group Member

### Response

```json
{
  "success": true,
  "data": {
    "member_count": 4,
    "today_meals": {
      "lunch": 3,
      "dinner": 2
    },
    "pending_shopping_items": 5,
    "monthly_grocery_expense": 8420,
    "monthly_shared_expense": 15600,
    "pending_settlements": 3,
    "recent_activity": [
    {
      "type": "expense",
      "title": "Electricity Bill",
      "created_at": "2026-07-22T10:15:00Z"
    }
  ]
  }
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden

### Validation

- `group_id` is required.

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER

---

# Settlements Module

## GET `/api/settlements?group_id=`

### Purpose

Retrieve the current settlement balances for all members in the specified group.

### Authorization

Any Group Member

### Response

```json
{
  "success": true,
  "data": [
    {
      "user_id": 1,
      "name": "Ankit",
      "net_balance": -1250
    },
    {
      "user_id": 2,
      "name": "Rahul",
      "net_balance": 1250
    }
  ]
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden

### Validation

- `group_id` is required.

### Business Rules

- Net balances are calculated using:
  - Shared expenses
  - Recorded payments
  - Manual adjustments
- Grocery purchases and meal attendance are excluded unless explicitly incorporated into settlement calculations by the application.

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER

---

## GET `/api/settlements/simplified?group_id=`

### Purpose

Retrieve optimized settlement recommendations that minimize the number of transactions required to settle all balances.

### Authorization

Any Group Member

### Response

```json
{
  "success": true,
  "data": [
    {
      "from": "Ankit",
      "to": "Rahul",
      "amount": 1250
    }
  ]
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden

### Validation

- `group_id` is required.

### Business Rules

- Settlement recommendations are generated using the application's settlement optimization algorithm.
- Recommended transactions do not modify any balances until an actual payment is recorded.

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER

---

# Analytics Module

## GET `/api/analytics?group_id=&month=`

### Purpose

Retrieve monthly analytics for the specified group.

### Authorization

Any Group Member

### Response

```json
{
  "success": true,
  "data": {
    "month": "2026-07",
    "total_expenses": 32450,
    "total_grocery_expense": 12800,
    "total_shared_expense": 19650,
    "meal_statistics": {
      "total_lunch": 82,
      "total_dinner": 74
    },
    "top_contributor": {
      "user_id": 2,
      "name": "Rahul",
      "amount": 9650
    }
  }
}
```

### Status Codes

- 200 OK
- 401 Unauthorized
- 403 Forbidden

### Validation

- `group_id` is required.
- Month must follow `YYYY-MM`.

### Errors

- UNAUTHORIZED
- NOT_A_MEMBER
- INVALID_MONTH_FORMAT

---

# Standard Response Format

## Success Response

```json
{
  "success": true,
  "data": {}
}
```

---

## Success Response with Message

```json
{
  "success": true,
  "message": "Operation completed successfully."
}
```

---

## Error Response

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Requested resource does not exist."
  }
}
```

---

# HTTP Status Codes

| Status Code | Meaning |
|-------------|---------|
| 200 OK | Request completed successfully |
| 201 Created | Resource created successfully |
| 400 Bad Request | Validation failed |
| 401 Unauthorized | Authentication required |
| 403 Forbidden | Insufficient permissions |
| 404 Not Found | Requested resource not found |
| 409 Conflict | Business rule conflict |
| 500 Internal Server Error | Unexpected server error |

---

# Common Error Codes

## Authentication

- UNAUTHORIZED
- INVALID_CREDENTIALS
- EMAIL_ALREADY_EXISTS
- INVALID_EMAIL_FORMAT
- WEAK_PASSWORD

---

## Authorization

- NOT_ADMIN
- NOT_A_MEMBER

---

## Groups

- GROUP_NOT_FOUND
- INVALID_GROUP_CODE
- ALREADY_A_MEMBER
- MEMBER_NOT_FOUND
- CANNOT_REMOVE_LAST_MEMBER
- CANNOT_LEAVE_LAST_MEMBER

---

## Users

- INVALID_PHONE_FORMAT
- INVALID_UPI_FORMAT

---

## Groceries

- GROCERY_NOT_FOUND
- NOT_PURCHASER
- CORRECTION_WINDOW_EXPIRED

---

## Shopping List

- SHOPPING_ITEM_NOT_FOUND

---

## Meals

- MEAL_NOT_FOUND
- CUTOFF_PASSED

---

## Expenses

- EXPENSE_NOT_FOUND
- NOT_EXPENSE_CREATOR
- INVALID_SPLIT_TYPE

---

## Payments

- PAYMENT_NOT_FOUND
- NOT_PAYMENT_CREATOR
- INVALID_PAYMENT
- INVALID_PAYMENT_MODE

---

## Adjustments

- ADJUSTMENT_NOT_FOUND

---

## Validation

- INVALID_TIME_FORMAT
- INVALID_MONTH_FORMAT

---

# API Design Principles

- The API follows RESTful design principles.
- All request and response bodies use JSON.
- Session-based authentication protects all non-public endpoints.
- Authorization is enforced at the endpoint level.
- Every endpoint validates user permissions before performing any operation.
- Every group-specific request explicitly specifies its target group.
- Resource ownership is enforced wherever applicable.
- All financial calculations are performed on the server.
- Settlement balances are recalculated automatically after any operation affecting financial data.
- Business rules are enforced consistently across all modules.
- Error responses follow a standardized structure.
- HTTP status codes are used consistently throughout the API.
- All timestamps are stored and processed using the server timezone unless otherwise specified.

---

# Design Notes

## Membership Rules

- A user may belong to multiple groups.
- A user can have only one membership record per group.
- Membership uniqueness is enforced by the database constraint:

```sql
UNIQUE(group_id, user_id)
```

---

## Group Ownership Rules

- Every group always has at least one administrator.
- Administrator ownership automatically transfers when the only administrator leaves.
- The last remaining member cannot leave.
- The last remaining member must delete the group.

---

## Group Deletion Rules

- Only a group administrator can delete a group.
- A group can only be deleted when it contains a single member.
- Deleting a group cascades deletion to all dependent records through foreign-key constraints, including:
  - group_settings
  - groceries
  - shopping_list
  - meals
  - expenses
  - expense_members
  - payments
  - adjustments

---

## Authorization Levels Used Throughout This API

- Public
- Authenticated User
- Any Group Member
- Group Administrator Only
- Resource Creator Only
- Resource Creator or Group Administrator

---