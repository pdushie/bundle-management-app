# Pricing API Documentation

This document outlines the API endpoints related to the pricing system in the Bundle Management application.

## Public Endpoints

### Get Current User's Pricing

**Endpoint:** `GET /api/pricing/current-user`

**Authentication:** Required

**Description:** Gets the pricing profile assigned to the currently logged-in user.

**Response:**

```json
{
  "hasProfile": true,
  "profile": {
    "id": 1,
    "name": "Standard Pricing",
    "description": "Default pricing profile",
    "basePrice": "10.00",
    "dataPricePerGB": "1.50",
    "minimumCharge": "10.00",
    "isActive": true,
    "isTiered": false,
    "createdAt": "2023-06-15T12:00:00.000Z",
    "updatedAt": "2023-06-15T12:00:00.000Z"
  },
  "assignmentId": 1,
  "assignedAt": "2023-06-15T12:00:00.000Z"
}
```

If no profile is assigned:

```json
{
  "hasProfile": false,
  "message": "You don't have a pricing profile assigned"
}
```

### Get User's Pricing

**Endpoint:** `GET /api/pricing/user/:userId`

**Authentication:** Required (user can only see their own pricing, admins can see any user's pricing)

**Description:** Gets the pricing profile assigned to a specific user.

**Parameters:**
- `userId`: ID of the user to get pricing for

**Response:** Same as the current user endpoint.

## Admin Endpoints

### Get All Pricing Profiles

**Endpoint:** `GET /api/admin/pricing-profiles`

**Authentication:** Required (admin only)

**Description:** Gets all pricing profiles in the system.

**Response:**

```json
[
  {
    "id": 1,
    "name": "Standard Pricing",
    "description": "Default pricing profile",
    "basePrice": "10.00",
    "dataPricePerGB": "1.50",
    "minimumCharge": "10.00",
    "isActive": true,
    "isTiered": false,
    "createdAt": "2023-06-15T12:00:00.000Z",
    "updatedAt": "2023-06-15T12:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Tiered Pricing",
    "description": "Volume-based pricing",
    "basePrice": "0.00",
    "minimumCharge": "5.00",
    "isActive": true,
    "isTiered": true,
    "tiers": [
      { "id": 1, "dataGB": "1.00", "price": "5.00" },
      { "id": 2, "dataGB": "5.00", "price": "20.00" },
      { "id": 3, "dataGB": "10.00", "price": "35.00" }
    ],
    "createdAt": "2023-06-15T12:00:00.000Z",
    "updatedAt": "2023-06-15T12:00:00.000Z"
  }
]
```

### Create Pricing Profile

**Endpoint:** `POST /api/admin/pricing-profiles`

**Authentication:** Required (admin only)

**Description:** Creates a new pricing profile.

**Request Body:**

```json
{
  "name": "Corporate Pricing",
  "description": "For corporate clients",
  "basePrice": "15.00",
  "dataPricePerGB": "1.00",
  "minimumCharge": "15.00",
  "isActive": true,
  "isTiered": false
}
```

For tiered pricing:

```json
{
  "name": "Corporate Tiered Pricing",
  "description": "Volume-based pricing for corporations",
  "basePrice": "0.00",
  "minimumCharge": "15.00",
  "isActive": true,
  "isTiered": true,
  "tiers": [
    { "dataGB": "5.00", "price": "20.00" },
    { "dataGB": "10.00", "price": "35.00" },
    { "dataGB": "20.00", "price": "60.00" }
  ]
}
```

**Response:** The created pricing profile.

### Update Pricing Profile

**Endpoint:** `PUT /api/admin/pricing-profiles/:profileId`

**Authentication:** Required (admin only)

**Description:** Updates an existing pricing profile.

**Parameters:**
- `profileId`: ID of the profile to update

**Request Body:** Same as create endpoint.

**Response:** The updated pricing profile.

### Delete Pricing Profile

**Endpoint:** `DELETE /api/admin/pricing-profiles/:profileId`

**Authentication:** Required (admin only)

**Description:** Deletes a pricing profile.

**Parameters:**
- `profileId`: ID of the profile to delete

**Response:**

```json
{
  "success": true,
  "message": "Pricing profile deleted successfully"
}
```

### Get User's Pricing Profiles

**Endpoint:** `GET /api/admin/users/:userId/pricing-profiles`

**Authentication:** Required (admin only)

**Description:** Gets all pricing profiles assigned to a specific user.

**Parameters:**
- `userId`: ID of the user to get profiles for

**Response:**

```json
[
  {
    "id": 1,
    "userId": 123,
    "profileId": 1,
    "profile": {
      "id": 1,
      "name": "Standard Pricing",
      "description": "Default pricing profile",
      "basePrice": "10.00",
      "dataPricePerGB": "1.50",
      "minimumCharge": "10.00",
      "isActive": true,
      "isTiered": false
    },
    "createdAt": "2023-06-15T12:00:00.000Z",
    "updatedAt": "2023-06-15T12:00:00.000Z"
  }
]
```

### Assign Pricing Profile to User

**Endpoint:** `POST /api/admin/user-profile-assignment`

**Authentication:** Required (admin only)

**Description:** Assigns a pricing profile to a user.

**Request Body:**

```json
{
  "userId": 123,
  "profileId": 1
}
```

**Response:**

```json
{
  "message": "User assigned to pricing profile successfully",
  "assignment": {
    "id": 1,
    "userId": 123,
    "profileId": 1,
    "createdAt": "2023-06-15T12:00:00.000Z",
    "updatedAt": "2023-06-15T12:00:00.000Z"
  }
}
```

### Remove Pricing Profile from User

**Endpoint:** `DELETE /api/admin/user-profile-assignment?userId=123&profileId=1`

**Authentication:** Required (admin only)

**Description:** Removes a pricing profile from a user.

**Query Parameters:**
- `profileId`: ID of the profile to remove
- `userId`: ID of the user to remove the profile from

**Response:**

```json
{
  "success": true,
  "message": "Pricing profile assignment removed successfully"
}
```

## Client-Side Utilities

The application includes client-side utilities in `src/lib/pricingClient.ts` to interact with these endpoints:

- `getCurrentUserPricing()`: Get the current user's pricing profile
- `getUserPricing(userId)`: Get a specific user's pricing profile
- `getAllPricingProfiles()`: Get all pricing profiles
- `assignPricingProfile(userId, profileId)`: Assign a pricing profile to a user
- `removePricingProfile(userId, profileId)`: Remove a pricing profile from a user
- `calculatePrice(profile, dataSizeGB)`: Calculate the price for a given data size based on a pricing profile

## Notes

- All monetary values are stored and returned as strings to prevent floating-point precision issues
- All pricing is in Ghanaian Cedi (GHS)
- The system supports both formula-based pricing (base price + per GB rate) and tiered pricing models
- Due to limitations with the Neon HTTP driver, transactions are not used in these API endpoints
