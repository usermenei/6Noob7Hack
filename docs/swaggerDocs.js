/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: token
 *
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "664abc123def456ghi789jkl"
 *         name:
 *           type: string
 *           example: "John Doe"
 *         email:
 *           type: string
 *           example: "john@example.com"
 *         telephoneNumber:
 *           type: string
 *           example: "0812345678"
 *         numberOfEntries:
 *           type: integer
 *           example: 3
 *         profilePicture:
 *           type: string
 *           nullable: true
 *           example: "https://drive.google.com/..."
 *         rank:
 *           type: integer
 *           example: 2
 *         title:
 *           type: string
 *           example: "Silver"
 *         discount:
 *           type: string
 *           example: "5%"
 *
 *     CoworkingSpace:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *           example: "HubSpace Bangkok"
 *         address:
 *           type: string
 *           example: "123 Silom Rd"
 *         district:
 *           type: string
 *           example: "Bang Rak"
 *         province:
 *           type: string
 *           example: "Bangkok"
 *         postalcode:
 *           type: string
 *           example: "10500"
 *         tel:
 *           type: string
 *           example: "021234567"
 *         region:
 *           type: string
 *           example: "Central"
 *         openTime:
 *           type: string
 *           example: "08:00"
 *         closeTime:
 *           type: string
 *           example: "20:00"
 *         picture:
 *           type: string
 *           nullable: true
 *         caption:
 *           type: string
 *           example: "A modern coworking space in the heart of Bangkok"
 *
 *     Room:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *           example: "Meeting Room A"
 *         capacity:
 *           type: integer
 *           example: 10
 *         price:
 *           type: number
 *           example: 500
 *         coworkingSpace:
 *           type: string
 *           description: CoworkingSpace ID
 *         status:
 *           type: string
 *           enum: [active, deleted]
 *
 *     TimeSlot:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         room:
 *           type: string
 *           description: Room ID
 *         startTime:
 *           type: string
 *           format: date-time
 *           example: "2025-04-12T09:00:00.000Z"
 *         endTime:
 *           type: string
 *           format: date-time
 *           example: "2025-04-12T10:00:00.000Z"
 *
 *     Reservation:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         user:
 *           type: string
 *         room:
 *           type: string
 *         timeSlots:
 *           type: array
 *           items:
 *             type: string
 *         roomSnapshot:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             price:
 *               type: number
 *             capacity:
 *               type: integer
 *         status:
 *           type: string
 *           enum: [pending, success, cancelled]
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     SlotAvailability:
 *       type: object
 *       properties:
 *         timeSlotId:
 *           type: string
 *         startTime:
 *           type: string
 *           format: date-time
 *         endTime:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [available, booked]
 *         price:
 *           type: integer
 *           description: Dynamic price based on time of day
 *
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error description"
 *
 *     Success:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 */

// ============================================================
// AUTH
// ============================================================

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication and user profile
 *   - name: Coworking Spaces
 *     description: Coworking space management
 *   - name: Rooms
 *     description: Room management and availability
 *   - name: Time Slots
 *     description: Time slot management
 *   - name: Reservations
 *     description: Reservation management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, telephoneNumber, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               telephoneNumber:
 *                 type: string
 *                 example: "0812345678"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "password123"
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *       400:
 *         description: Validation error or duplicate email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Logged in successfully, returns JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *       400:
 *         description: Missing email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current logged-in user profile with rank info
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/logout:
 *   get:
 *     tags: [Auth]
 *     summary: Logout and clear cookie
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */

/**
 * @swagger
 * /auth/me/photo:
 *   put:
 *     tags: [Auth]
 *     summary: Update profile picture (Google Drive URL)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [profilePicture]
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 example: "https://drive.google.com/file/d/abc123/view"
 *     responses:
 *       200:
 *         description: Profile picture updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     profilePicture:
 *                       type: string
 *       400:
 *         description: Missing picture URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// ============================================================
// COWORKING SPACES
// ============================================================

/**
 * @swagger
 * /coworkingspaces:
 *   get:
 *     tags: [Coworking Spaces]
 *     summary: Get all coworking spaces (with filtering, sorting, pagination)
 *     parameters:
 *       - in: query
 *         name: select
 *         schema:
 *           type: string
 *         description: Comma-separated fields to include (e.g. name,district)
 *         example: "name,district,province"
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Comma-separated fields to sort by (prefix - for descending)
 *         example: "-createdAt"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 25
 *       - in: query
 *         name: province
 *         schema:
 *           type: string
 *         description: Filter by province
 *         example: "Bangkok"
 *     responses:
 *       200:
 *         description: List of coworking spaces
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     next:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                     prev:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CoworkingSpace'
 *   post:
 *     tags: [Coworking Spaces]
 *     summary: Create a new coworking space (Admin only)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, address, district, province, postalcode, tel, region, openTime, closeTime]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "HubSpace Bangkok"
 *               address:
 *                 type: string
 *                 example: "123 Silom Rd"
 *               district:
 *                 type: string
 *                 example: "Bang Rak"
 *               province:
 *                 type: string
 *                 example: "Bangkok"
 *               postalcode:
 *                 type: string
 *                 example: "10500"
 *               tel:
 *                 type: string
 *                 example: "021234567"
 *               region:
 *                 type: string
 *                 example: "Central"
 *               openTime:
 *                 type: string
 *                 example: "08:00"
 *               closeTime:
 *                 type: string
 *                 example: "20:00"
 *     responses:
 *       201:
 *         description: Coworking space created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CoworkingSpace'
 *       400:
 *         description: Validation error or duplicate name
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not authorized (admin only)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /coworkingspaces/{id}:
 *   get:
 *     tags: [Coworking Spaces]
 *     summary: Get a single coworking space by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coworking space ID
 *     responses:
 *       200:
 *         description: Coworking space details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CoworkingSpace'
 *       404:
 *         description: Coworking space not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     tags: [Coworking Spaces]
 *     summary: Update a coworking space (Admin only)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CoworkingSpace'
 *     responses:
 *       200:
 *         description: Updated coworking space
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CoworkingSpace'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags: [Coworking Spaces]
 *     summary: Delete a coworking space and all its reservations (Admin only)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /coworkingspaces/{id}/photo:
 *   put:
 *     tags: [Coworking Spaces]
 *     summary: Update photo and/or caption of a coworking space (Admin only)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               picture:
 *                 type: string
 *                 example: "https://drive.google.com/file/d/abc123/view"
 *               caption:
 *                 type: string
 *                 example: "A modern coworking space"
 *     responses:
 *       200:
 *         description: Photo updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     picture:
 *                       type: string
 *                     caption:
 *                       type: string
 *       400:
 *         description: No picture or caption provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// ============================================================
// ROOMS
// ============================================================

/**
 * @swagger
 * /rooms:
 *   get:
 *     tags: [Rooms]
 *     summary: Get all active rooms (with coworking space info)
 *     responses:
 *       200:
 *         description: List of active rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Room'
 *   post:
 *     tags: [Rooms]
 *     summary: Create a new room (Admin only)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, capacity, price, coworkingSpace]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Meeting Room A"
 *               capacity:
 *                 type: integer
 *                 example: 10
 *               price:
 *                 type: number
 *                 example: 500
 *               coworkingSpace:
 *                 type: string
 *                 description: Coworking space ID
 *                 example: "664abc123def456ghi789jkl"
 *     responses:
 *       201:
 *         description: Room created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Room'
 *       400:
 *         description: Missing fields or duplicate room name
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Coworking space not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /rooms/availability:
 *   get:
 *     tags: [Rooms]
 *     summary: Get room availability with dynamic pricing for a specific date
 *     description: |
 *       Returns all active rooms with their time slots and booking status for the given date.
 *       Dynamic pricing applies based on time of day:
 *       - **Base price**: 00:00–11:59
 *       - **Peak price (×1.5)**: 12:00–17:59
 *       - **Evening price (×1.2)**: 18:00–23:59
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check availability (YYYY-MM-DD)
 *         example: "2025-04-12"
 *     responses:
 *       200:
 *         description: Room availability for the date
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 date:
 *                   type: string
 *                   example: "2025-04-12"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       roomId:
 *                         type: string
 *                       roomName:
 *                         type: string
 *                       capacity:
 *                         type: integer
 *                       basePrice:
 *                         type: number
 *                       coworkingSpace:
 *                         $ref: '#/components/schemas/CoworkingSpace'
 *                       slots:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/SlotAvailability'
 *       400:
 *         description: Missing date parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /rooms/{id}:
 *   put:
 *     tags: [Rooms]
 *     summary: Update a room (Admin only)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               capacity:
 *                 type: integer
 *               price:
 *                 type: number
 *               coworkingSpace:
 *                 type: string
 *     responses:
 *       200:
 *         description: Room updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Room'
 *       400:
 *         description: Duplicate room name
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags: [Rooms]
 *     summary: Soft-delete a room (Admin only) — sets status to 'deleted'
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Room has active reservations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// ============================================================
// NESTED ROOM ROUTES (under coworking spaces)
// ============================================================

/**
 * @swagger
 * /coworkingspaces/{coworkingId}/rooms:
 *   get:
 *     tags: [Rooms]
 *     summary: Get all active rooms in a specific coworking space
 *     parameters:
 *       - in: path
 *         name: coworkingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Coworking space ID
 *         example: "664abc123def456ghi789jkl"
 *     responses:
 *       200:
 *         description: List of active rooms in the coworking space
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Room'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /coworkingspaces/{coworkingId}/rooms/{roomId}:
 *   get:
 *     tags: [Rooms]
 *     summary: Get a single room in a coworking space with optional availability
 *     description: |
 *       Returns room details. If `date` query param is provided, also returns
 *       time slots with availability and dynamic pricing:
 *       - **Base price**: 00:00–11:59
 *       - **Peak price (×1.5)**: 12:00–17:59
 *       - **Evening price (×1.2)**: 18:00–23:59
 *     parameters:
 *       - in: path
 *         name: coworkingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Coworking space ID
 *         example: "664abc123def456ghi789jkl"
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
 *         example: "664def456ghi789jkl123abc"
 *       - in: query
 *         name: date
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to check availability (YYYY-MM-DD). If omitted, only room info is returned.
 *         example: "2025-04-12"
 *     responses:
 *       200:
 *         description: Room details (with slots if date provided)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Room'
 *                     - type: object
 *                       properties:
 *                         slots:
 *                           type: array
 *                           description: Only present when date query param is provided
 *                           items:
 *                             $ref: '#/components/schemas/SlotAvailability'
 *       404:
 *         description: Room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// ============================================================
// TIME SLOTS
// ============================================================

/**
 * @swagger
 * /timeslots:
 *   post:
 *     tags: [Time Slots]
 *     summary: Create a time slot for a room (Admin only)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [room, startTime, endTime]
 *             properties:
 *               room:
 *                 type: string
 *                 description: Room ID
 *                 example: "664abc123def456ghi789jkl"
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-04-12T09:00:00.000Z"
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-04-12T10:00:00.000Z"
 *     responses:
 *       201:
 *         description: Time slot created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TimeSlot'
 *       400:
 *         description: Overlapping time slot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /timeslots/{roomId}:
 *   get:
 *     tags: [Time Slots]
 *     summary: Get all time slots for a room
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID to fetch time slots for
 *     responses:
 *       200:
 *         description: List of time slots
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TimeSlot'
 */

// ============================================================
// RESERVATIONS
// ============================================================

/**
 * @swagger
 * /reservations:
 *   get:
 *     tags: [Reservations]
 *     summary: Get all reservations (admin sees all; user sees own only)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of reservations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reservation'
 *   post:
 *     tags: [Reservations]
 *     summary: Create a reservation for one or more consecutive time slots
 *     description: |
 *       Rules:
 *       - All `timeSlotIds` must belong to the same room
 *       - Slots must be continuous (no gaps)
 *       - None of the slots can already be booked (pending or success)
 *       - A user may have at most **3 active** reservations at a time
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [timeSlotIds]
 *             properties:
 *               timeSlotIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 example: ["slot_id_1", "slot_id_2"]
 *     responses:
 *       201:
 *         description: Reservation created with status 'pending'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Slots not continuous, already booked, or 3-reservation limit reached
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: One or more time slots not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /reservations/{id}:
 *   get:
 *     tags: [Reservations]
 *     summary: Get a single reservation by ID
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       403:
 *         description: Not authorized to view this reservation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Reservation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     tags: [Reservations]
 *     summary: Update time slots of a pending reservation
 *     description: Only reservations with status 'pending' can be updated.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [timeSlotIds]
 *             properties:
 *               timeSlotIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["slot_id_3", "slot_id_4"]
 *     responses:
 *       200:
 *         description: Reservation updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Reservation is not pending or slot is already booked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Reservation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     tags: [Reservations]
 *     summary: Cancel a reservation (sets status to 'cancelled')
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation cancelled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       403:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Reservation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /reservations/{id}/confirm:
 *   put:
 *     tags: [Reservations]
 *     summary: Confirm a reservation (Admin only) — sets status to 'success' and increments user entries
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation confirmed and user rank entry incremented
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Reservation confirmed"
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       403:
 *         description: Admin only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Reservation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// ============================================================
// PAYMENTS
// ============================================================
/**
 * @swagger
 * tags:
 *   - name: Payments
 *     description: Payment processing (QR, Cash)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         reservation:
 *           type: string
 *         user:
 *           type: string
 *         amount:
 *           type: number
 *         method:
 *           type: string
 *           enum: [qr, cash]
 *         status:
 *           type: string
 *           enum: [pending, completed, failed]
 *         transactionId:
 *           type: string
 *           nullable: true
 *         qrImageBase64:
 *           type: string
 *           nullable: true
 *         qrExpiresAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         cashConfirmedBy:
 *           type: string
 *           nullable: true
 *         cashConfirmedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     PaymentResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Payment'
 *
 *     PaymentError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Error message
 */

/**
 * @swagger
 * /payments:
 *   post:
 *     tags: [Payments]
 *     summary: Create a payment for a reservation
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reservationId, method]
 *             properties:
 *               reservationId:
 *                 type: string
 *                 example: "664abc123def456ghi789jkl"
 *               method:
 *                 type: string
 *                 enum: [qr, cash]
 *                 example: "qr"
 *     responses:
 *       201:
 *         description: Payment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: string
 *                     reservationId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     method:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Invalid input or duplicate payment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get a payment (owner or admin)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Payment not found
 */

/**
 * @swagger
 * /payments/{id}/confirm:
 *   put:
 *     tags: [Payments]
 *     summary: Confirm payment (generic)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Payment confirmed
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Payment not found
 */

/**
 * @swagger
 * /payments/{id}/fail:
 *   put:
 *     tags: [Payments]
 *     summary: Mark payment as failed
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Payment marked as failed
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Payment not found
 */

/**
 * @swagger
 * /payments/{id}/qr:
 *   post:
 *     tags: [Payments]
 *     summary: Generate QR code for payment
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: QR generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentId:
 *                   type: string
 *                 qrImage:
 *                   type: string
 *                   example: "data:image/png;base64,..."
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                 expiresInSec:
 *                   type: number
 *       400:
 *         description: Invalid payment state
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Payment not found
 */
/**
 * @swagger
 * /payments/{id}/confirm-qr:
 *   put:
 *     tags: [Payments]
 *     summary: Confirm QR payment (after scan)
 *     description: |
 *       Confirms a QR payment using a qrId generated earlier.
 *       The system will verify that the QR is valid, not expired, and not reused.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrId
 *             properties:
 *               qrId:
 *                 type: string
 *                 example: "664abc123def456ghi789xyz"
 *                 description: ID of the QR code record
 *     responses:
 *       200:
 *         description: QR payment confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: string
 *                     transactionId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       example: completed
 *       400:
 *         description: QR expired, already used, or invalid state
 *       404:
 *         description: Payment or QR record not found
 *       403:
 *         description: Not authorized
 */
/**
 * @swagger
 * /payments/{id}/qr-status:
 *   get:
 *     tags: [Payments]
 *     summary: Check QR validity and countdown
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: QR status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 paymentStatus:
 *                   type: string
 *                 qrExpired:
 *                   type: boolean
 *                 secondsLeft:
 *                   type: number
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Payment not found
 */

/**
 * @swagger
 * /payments/{id}/confirm-cash:
 *   put:
 *     tags: [Payments]
 *     summary: Admin confirms cash payment
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Cash payment confirmed
 *       400:
 *         description: Invalid state
 *       403:
 *         description: Admin only
 *       404:
 *         description: Payment not found
 */

/**
 * @swagger
 * /payments/pending-cash:
 *   get:
 *     tags: [Payments]
 *     summary: Get all pending cash payments (Admin dashboard)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of pending cash payments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *       403:
 *         description: Admin only
 */

// ============================================================
// PAYMENTS
// ============================================================

/**
 * @swagger
 * tags:
 *   - name: Payments
 *     description: Payment processing
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: token
 *
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "664abc123def456ghi789jkl"
 *         reservation:
 *           type: string
 *           example: "664f1a2b3c4d5e6f7a8b9c0d"
 *         user:
 *           type: string
 *           example: "664f1a2b3c4d5e6f7a8b9c01"
 *         amount:
 *           type: number
 *           example: 500
 *         method:
 *           type: string
 *           enum: [qr, cash]
 *         status:
 *           type: string
 *           enum: [pending, completed, failed, cancelled, refund_required]
 *         transactionId:
 *           type: string
 *           nullable: true
 *           example: "TXN-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         uiBadge:
 *           type: object
 *           nullable: true
 *           description: มีเฉพาะตอน status เป็น refund_required
 *           properties:
 *             color:
 *               type: string
 *               example: "orange"
 *             tooltip:
 *               type: string
 *               example: "Contact Admin"
 *
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error description"
 *
 *     Success:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 */

/**
 * @swagger
 * /payments/user/{userId}:
 *   get:
 *     tags: [Payments]
 *     summary: Get all payments for a specific user
 *     description: |
 *       ดึง payment ทั้งหมดของ user เรียงจากใหม่ไปเก่า
 *       - User สามารถดูได้เฉพาะ payment ของตัวเองเท่านั้น
 *       - ถ้า payment มีสถานะ `refund_required` จะมี `uiBadge` ติดมาด้วย
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "664f1a2b3c4d5e6f7a8b9c01"
 *     responses:
 *       200:
 *         description: รายการ payment ของ user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *             example:
 *               success: true
 *               count: 1
 *               data:
 *                 - _id: "664abc123def456ghi789jkl"
 *                   reservation: "664f1a2b3c4d5e6f7a8b9c0d"
 *                   amount: 500
 *                   method: "qr"
 *                   status: "refund_required"
 *                   createdAt: "2024-06-01T10:00:00.000Z"
 *                   uiBadge:
 *                     color: "orange"
 *                     tooltip: "Contact Admin"
 *       403:
 *         description: ไม่มีสิทธิ์ดู payment ของ user คนอื่น
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Unauthorized"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /payments/{id}/method:
 *   put:
 *     tags: [Payments]
 *     summary: Update payment method (qr ↔ cash)
 *     description: |
 *       เปลี่ยนวิธีการชำระเงินของ payment ที่มีสถานะ `pending`
 *       - เปลี่ยนได้เฉพาะ payment สถานะ **pending** เท่านั้น
 *       - ถ้าสถานะเป็น `completed` แล้ว ต้องติดต่อ Admin
 *       - เจ้าของ payment หรือ Admin เท่านั้นที่เปลี่ยนได้
 *       - ถ้าเปลี่ยนจาก `qr` → `cash` จะล้าง activeQr ออกอัตโนมัติ
 *       - ถ้าเปลี่ยนจาก `cash` → `qr` จะล้างข้อมูล cashConfirmed ออกอัตโนมัติ
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *         example: "664abc123def456ghi789jkl"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [method]
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [qr, cash]
 *                 example: "cash"
 *     responses:
 *       200:
 *         description: เปลี่ยนวิธีชำระเงินสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         description: |
 *           - `method` ไม่ถูกต้อง (ต้องเป็น qr หรือ cash)
 *           - Payment สถานะ `completed` แล้ว
 *           - Payment ไม่ใช่สถานะ `pending`
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               completed:
 *                 summary: Payment สำเร็จแล้ว
 *                 value:
 *                   success: false
 *                   message: "Payment already completed. Contact Admin to change."
 *               notPending:
 *                 summary: ไม่ใช่ pending
 *                 value:
 *                   success: false
 *                   message: "Only pending payments can change method"
 *               invalidMethod:
 *                 summary: method ไม่ถูกต้อง
 *                 value:
 *                   success: false
 *                   message: "method must be \"qr\" or \"cash\""
 *       403:
 *         description: ไม่ใช่เจ้าของ payment หรือ Admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Not authorized"
 *       404:
 *         description: ไม่พบ payment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Payment not found"
 */

// ============================================================
// RESERVATIONS
// ============================================================

/**
 * @swagger
 * tags:
 *   - name: Reservations
 *     description: Reservation management
 */

/**
 * @swagger
 * /reservations/{id}:
 *   delete:
 *     tags: [Reservations]
 *     summary: Cancel a reservation (soft cancel)
 *     description: |
 *       ยกเลิกการจอง โดยมีเงื่อนไขดังนี้
 *       - ยกเลิกได้เฉพาะ **ก่อนถึงเวลา check-in** เท่านั้น
 *       - เจ้าของ reservation หรือ Admin เท่านั้นที่ยกเลิกได้
 *
 *       **กรณี payment `completed` แล้ว:**
 *       - reservation → `cancelled`
 *       - payment → `refund_required`
 *       - แจ้ง Admin เพื่อดำเนินการคืนเงิน
 *
 *       **กรณี payment `pending` หรือยังไม่ได้ชำระ:**
 *       - reservation → `cancelled`
 *       - payment (ถ้ามี) → `cancelled`
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reservation ID
 *         example: "664f1a2b3c4d5e6f7a8b9c0d"
 *     responses:
 *       200:
 *         description: ยกเลิกการจองสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *             examples:
 *               unpaid:
 *                 summary: ยังไม่ได้ชำระเงิน
 *                 value:
 *                   success: true
 *                   message: "Reservation cancelled"
 *               refundRequired:
 *                 summary: ชำระแล้ว — ต้องคืนเงิน
 *                 value:
 *                   success: true
 *                   message: "Reservation cancelled. Payment marked as refund_required and admin notified."
 *       400:
 *         description: เลยเวลา check-in แล้ว ไม่สามารถยกเลิกได้
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Cannot cancel reservation after check-in time has passed"
 *       403:
 *         description: ไม่ใช่เจ้าของ reservation หรือ Admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Not authorized"
 *       404:
 *         description: ไม่พบ reservation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               message: "Reservation not found"
 */