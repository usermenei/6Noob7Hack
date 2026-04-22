/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "64abc123def456"
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
 *           example: 5
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
 *           example: "The Hub Coworking"
 *         address:
 *           type: string
 *           example: "123 Main Street"
 *         district:
 *           type: string
 *           example: "Pathum Wan"
 *         province:
 *           type: string
 *           example: "Bangkok"
 *         postalcode:
 *           type: string
 *           example: "10330"
 *         tel:
 *           type: string
 *           example: "02-123-4567"
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
 *           example: "https://drive.google.com/..."
 *         caption:
 *           type: string
 *           example: "A modern coworking space"
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
 *           example: 300
 *         coworkingSpace:
 *           type: string
 *           example: "64abc123def456"
 *         picture:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [active, deleted]
 *           example: "active"
 *
 *     TimeSlot:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         room:
 *           type: string
 *           example: "64abc123def456"
 *         startTime:
 *           type: string
 *           format: date-time
 *           example: "2024-06-01T08:00:00.000Z"
 *         endTime:
 *           type: string
 *           format: date-time
 *           example: "2024-06-01T09:00:00.000Z"
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
 *           example: "pending"
 *         createdAt:
 *           type: string
 *           format: date-time
 *
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
 *           example: 600
 *         method:
 *           type: string
 *           enum: [qr, cash]
 *         status:
 *           type: string
 *           enum: [pending, completed, failed, cancelled, refund_required, refunded]
 *         transactionId:
 *           type: string
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
 *           type: number
 *           example: 450
 *
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error message"
 */

// ============================================================
// AUTH
// ============================================================

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints
 *   - name: CoworkingSpaces
 *     description: Coworking space management
 *   - name: Rooms
 *     description: Room management
 *   - name: TimeSlots
 *     description: Time slot management
 *   - name: Reservations
 *     description: Reservation management
 *   - name: Payments
 *     description: Payment management
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
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
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
 *         description: Login successful
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
 *         description: Missing credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current logged-in user profile with rank
 *     security:
 *       - bearerAuth: []
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
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /auth/logout:
 *   get:
 *     tags: [Auth]
 *     summary: Logout user (clears cookie)
 *     responses:
 *       200:
 *         description: Logged out successfully
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
 *                   example: "Logged out successfully"
 */

/**
 * @swagger
 * /auth/me/photo:
 *   put:
 *     tags: [Auth]
 *     summary: Update profile picture URL
 *     security:
 *       - bearerAuth: []
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
 *                 example: "https://drive.google.com/..."
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
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: User not found
 */

// ============================================================
// COWORKING SPACES
// ============================================================

/**
 * @swagger
 * /coworkingspaces:
 *   get:
 *     tags: [CoworkingSpaces]
 *     summary: Get all coworking spaces (supports filtering, sorting, pagination)
 *     parameters:
 *       - in: query
 *         name: select
 *         schema:
 *           type: string
 *         description: "Comma-separated fields to select (e.g. name,district)"
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: "Comma-separated fields to sort by (e.g. name,-createdAt)"
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
 *         description: "Filter by province"
 *       - in: query
 *         name: district
 *         schema:
 *           type: string
 *         description: "Filter by district"
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
 *     tags: [CoworkingSpaces]
 *     summary: Create a new coworking space (Admin only)
 *     security:
 *       - bearerAuth: []
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
 *                 example: "The Hub Coworking"
 *               address:
 *                 type: string
 *                 example: "123 Main Street"
 *               district:
 *                 type: string
 *                 example: "Pathum Wan"
 *               province:
 *                 type: string
 *                 example: "Bangkok"
 *               postalcode:
 *                 type: string
 *                 example: "10330"
 *               tel:
 *                 type: string
 *                 example: "02-123-4567"
 *               region:
 *                 type: string
 *                 example: "Central"
 *               openTime:
 *                 type: string
 *                 example: "08:00"
 *               closeTime:
 *                 type: string
 *                 example: "20:00"
 *               picture:
 *                 type: string
 *                 nullable: true
 *               caption:
 *                 type: string
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
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /coworkingspaces/{id}:
 *   get:
 *     tags: [CoworkingSpaces]
 *     summary: Get single coworking space by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Coworking space ID
 *     responses:
 *       200:
 *         description: Coworking space found
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
 *   put:
 *     tags: [CoworkingSpaces]
 *     summary: Update coworking space (Admin only)
 *     security:
 *       - bearerAuth: []
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
 *         description: Coworking space updated
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
 *       401:
 *         description: Not authenticated
 *   delete:
 *     tags: [CoworkingSpaces]
 *     summary: Delete coworking space and its reservations (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coworking space deleted
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
 *                   example: "Coworking space deleted successfully"
 *       404:
 *         description: Coworking space not found
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /coworkingspaces/{id}/photo:
 *   put:
 *     tags: [CoworkingSpaces]
 *     summary: Update coworking space photo URL and/or caption (Admin only)
 *     security:
 *       - bearerAuth: []
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
 *                 example: "https://drive.google.com/..."
 *               caption:
 *                 type: string
 *                 example: "Beautiful coworking space"
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
 *       404:
 *         description: Coworking space not found
 */

/**
 * @swagger
 * /coworkingspaces/{coworkingId}/rooms:
 *   get:
 *     tags: [CoworkingSpaces]
 *     summary: Get all active rooms for a specific coworking space
 *     parameters:
 *       - in: path
 *         name: coworkingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Coworking space ID
 *     responses:
 *       200:
 *         description: List of rooms
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
 */

/**
 * @swagger
 * /coworkingspaces/{coworkingId}/rooms/{roomId}:
 *   get:
 *     tags: [CoworkingSpaces]
 *     summary: Get a single room within a coworking space, optionally with availability
 *     parameters:
 *       - in: path
 *         name: coworkingId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: "Date to check availability (YYYY-MM-DD)"
 *     responses:
 *       200:
 *         description: Room details with optional slot availability
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
 *                           items:
 *                             $ref: '#/components/schemas/SlotAvailability'
 *       404:
 *         description: Room not found
 */

// ============================================================
// ROOMS
// ============================================================

/**
 * @swagger
 * /rooms/availability:
 *   get:
 *     tags: [Rooms]
 *     summary: Get availability for all active rooms on a specific date (with dynamic pricing)
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: "Date to check availability (YYYY-MM-DD)"
 *     responses:
 *       200:
 *         description: Availability data for all rooms
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
 *                   example: "2024-06-01"
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
 *         description: Date is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

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
 *                 example: 300
 *               coworkingSpace:
 *                 type: string
 *                 description: Coworking space ID
 *                 example: "64abc123def456"
 *               picture:
 *                 type: string
 *                 nullable: true
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
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin only
 *       404:
 *         description: Coworking space not found
 */

/**
 * @swagger
 * /rooms/{id}:
 *   put:
 *     tags: [Rooms]
 *     summary: Update room details (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
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
 *               picture:
 *                 type: string
 *                 nullable: true
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
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin only
 *       404:
 *         description: Room or coworking space not found
 *   delete:
 *     tags: [Rooms]
 *     summary: Soft-delete a room (Admin only) — sets status to 'deleted'
 *     security:
 *       - bearerAuth: []
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Room deleted"
 *       400:
 *         description: Room has active reservations
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin only
 *       404:
 *         description: Room not found
 */

// ============================================================
// TIME SLOTS
// ============================================================

/**
 * @swagger
 * /timeslots:
 *   post:
 *     tags: [TimeSlots]
 *     summary: Create a new time slot for a room (must be within coworking space open hours, no overlap)
 *     security:
 *       - bearerAuth: []
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
 *                 example: "64abc123def456"
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-06-01T08:00:00.000Z"
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-06-01T09:00:00.000Z"
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
 *         description: Outside open hours or slot overlaps
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Room or coworking space not found
 */

/**
 * @swagger
 * /timeslots/{roomId}:
 *   get:
 *     tags: [TimeSlots]
 *     summary: Get all time slots for a specific room (sorted by start time)
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Room ID
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
 *                 count:
 *                   type: integer
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
 *     summary: Get all reservations (Admin sees all; users see own only)
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Not authenticated
 *   post:
 *     tags: [Reservations]
 *     summary: Create a new reservation (max 3 active per user)
 *     security:
 *       - bearerAuth: []
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
 *                 description: Array of TimeSlot IDs (all must belong to same room)
 *                 example: ["64abc1", "64abc2"]
 *     responses:
 *       201:
 *         description: Reservation created
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
 *         description: Invalid slots, already booked, or max 3 reservations exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /reservations/{id}:
 *   get:
 *     tags: [Reservations]
 *     summary: Get single reservation (owner or admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation found
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
 *         description: Not authorized
 *       404:
 *         description: Reservation not found
 *   put:
 *     tags: [Reservations]
 *     summary: Update reservation time slots (pending status only, owner or admin)
 *     security:
 *       - bearerAuth: []
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
 *                 example: ["64abc3", "64abc4"]
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
 *         description: Not pending or slot already booked
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Reservation not found
 *   delete:
 *     tags: [Reservations]
 *     summary: Cancel reservation (sets status to cancelled; handles refund if paid)
 *     security:
 *       - bearerAuth: []
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Reservation cancelled"
 *       400:
 *         description: Cannot cancel after check-in time
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Reservation not found
 */

/**
 * @swagger
 * /reservations/{id}/permanent:
 *   delete:
 *     tags: [Reservations]
 *     summary: Permanently delete a reservation from the database (owner or admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation permanently deleted
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
 *                   example: "Reservation permanently deleted"
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Reservation not found
 */

/**
 * @swagger
 * /reservations/{id}/confirm:
 *   put:
 *     tags: [Reservations]
 *     summary: Admin confirm reservation (sets status to success, increments user entries)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reservation confirmed
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
 *       404:
 *         description: Reservation not found
 */

// ============================================================
// PAYMENTS
// ============================================================

/**
 * @swagger
 * /payments:
 *   post:
 *     tags: [Payments]
 *     summary: Create a payment for a reservation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reservation, amount, method]
 *             properties:
 *               reservation:
 *                 type: string
 *                 description: Reservation ID
 *                 example: "64abc123def456"
 *               amount:
 *                 type: number
 *                 example: 600
 *               method:
 *                 type: string
 *                 enum: [qr, cash]
 *                 example: "qr"
 *     responses:
 *       201:
 *         description: Payment created
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
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /payments/pending-cash:
 *   get:
 *     tags: [Payments]
 *     summary: Get all pending cash payments (for admin to review)
 *     security:
 *       - bearerAuth: []
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
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /payments/user/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get all payments for a specific user (sorted by date descending)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of payments for the user
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
 *                     $ref: '#/components/schemas/Payment'
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /coworkingspaces/{coworkingId}/qr-code:
 *   get:
 *     tags: [CoworkingSpaces]
 *     summary: Get active QR code image for a coworking space (for payment page)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: coworkingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Coworking space ID
 *     responses:
 *       200:
 *         description: QR code image (returns raw image binary)
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: No active QR code found for this coworking space
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /payments/admin/qr-code/info:
 *   get:
 *     tags: [Payments]
 *     summary: Get admin QR code metadata/info (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: QR code info
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
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin only
 */

/**
 * @swagger
 * /payments/admin/{id}/method:
 *   put:
 *     tags: [Payments]
 *     summary: Admin update payment method with audit log (Admin only)
 *     security:
 *       - bearerAuth: []
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
 *             required: [method]
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [qr, cash]
 *     responses:
 *       200:
 *         description: Payment method updated
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
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin only
 *       404:
 *         description: Payment not found
 */

/**
 * @swagger
 * /payments/admin/{id}/cancel:
 *   put:
 *     tags: [Payments]
 *     summary: Admin cancel a payment with audit log (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment cancelled
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
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin only
 *       404:
 *         description: Payment not found
 */

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     tags: [Payments]
 *     summary: Get single payment by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment found
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
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Payment not found
 */

/**
 * @swagger
 * /payments/{id}/confirm:
 *   put:
 *     tags: [Payments]
 *     summary: Confirm a payment (marks as completed)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment confirmed
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
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Payment not found
 */

/**
 * @swagger
 * /payments/{id}/fail:
 *   put:
 *     tags: [Payments]
 *     summary: Mark a payment as failed
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment marked as failed
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
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Payment not found
 */

/**
 * @swagger
 * /payments/{id}/method:
 *   put:
 *     tags: [Payments]
 *     summary: Update payment method (user self-service)
 *     security:
 *       - bearerAuth: []
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
 *             required: [method]
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [qr, cash]
 *     responses:
 *       200:
 *         description: Payment method updated
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
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Payment not found
 */

/**
 * @swagger
 * /api/v1/payments/{id}/confirm-qr:
 *   put:
 *     tags: [Payments]
 *     summary: Confirm QR payment — ระบบหา QR code จาก coworking space ของ reservation เองอัตโนมัติ
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: QR payment confirmed
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
 *                       example: "completed"
 *                     amount:
 *                       type: number
 *       400:
 *         description: Not a QR payment, or payment not pending
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Payment or reservation not found, or no active QR code for this space
 *       401:
 *         description: Not authenticated
 */

/**
 * @swagger
 * /payments/{id}/confirm-cash:
 *   put:
 *     tags: [Payments]
 *     summary: Confirm cash payment (records confirmedBy and timestamp)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cash payment confirmed
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
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Payment not found
 */