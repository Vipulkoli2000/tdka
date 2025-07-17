const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();
const { z } = require("zod");
const createError = require("http-errors");
const bcrypt = require("bcryptjs");

/**
 * Wrap async route handlers and funnel errors through Express error middleware.
 * Converts Prisma validation errors and known request errors into structured 400 responses.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    // Zod or manual user errors forwarded by validateRequest
    if (err.status === 400 && err.expose) {
      return res
        .status(400)
        .json({ errors: err.errors || { message: err.message } });
    }
    // Prisma validation errors
    if (err.name === "PrismaClientValidationError") {
      return res.status(400).json({ errors: { message: err.message } });
    }
    // Prisma known request errors (e.g., unique constraint)
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002" && err.meta?.target) {
        const field = Array.isArray(err.meta.target)
          ? err.meta.target[0]
          : err.meta.target;
        const message = `A record with that ${field} already exists.`;
        return res
          .status(400)
          .json({ errors: { [field]: { type: "unique", message } } });
      }
    }
    // Fallback for unexpected errors
    console.error(err);
    return res
      .status(500)
      .json({ errors: { message: "Internal Server Error" } });
  });
};


const getClubs = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, parseInt(req.query.limit) || 10);
  const skip = (page - 1) * limit;

  const { search = "", sortBy = "clubName", sortOrder = "asc" } = req.query;

  // Map frontend sort field "name" to database column "clubName"
  const mappedSortBy = sortBy === "name" ? "clubName" : sortBy;

  const where = search
    ? {
        OR: [
          { clubName: { contains: search } },
          { city: { contains: search } },
          { address: { contains: search } },
        ],
      }
    : {};

  const [clubs, total] = await Promise.all([
    prisma.club.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [mappedSortBy]: sortOrder },
      select: {
        id: true,
        clubName: true,
        city: true,
        address: true,
        mobile: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.club.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  res.json({
    clubs,
    page,
    totalPages,
    totalClubs: total,
  });
});

const getClub = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) throw createError(400, "Invalid club ID");

  const club = await prisma.club.findUnique({
    where: { id },
    select: {
      id: true,
      clubName: true,
      city: true,
      address: true,
      mobile: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!club) throw createError(404, "Club not found");

  res.json(club);
});

const createClub = asyncHandler(async (req, res) => {
  const schema = z.object({
    clubName: z.string().min(1, "Club name is required").max(255),
    city: z.string().min(1, "City is required").max(255),
    address: z.string().min(1, "Address is required").max(500),
    mobile: z.string().min(1, "Mobile number is required").max(20),
    email: z.string().email("Valid email is required").max(255),
    password: z.string().min(6, "Password must be at least 6 characters").max(255),
  });

  // Will throw Zod errors caught by asyncHandler
  const validatedData = await schema.parseAsync(req.body);

  // Hash the password before saving
  const hashedPassword = await bcrypt.hash(validatedData.password, 10);
  const dataWithHashedPassword = {
    ...validatedData,
    password: hashedPassword
  };

  const club = await prisma.club.create({ data: dataWithHashedPassword });

  // Return club without password
  const { password, ...clubResponse } = club;
  res.status(201).json(clubResponse);
});

const updateClub = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) throw createError(400, "Invalid club ID");

  const schema = z
    .object({
      clubName: z.string().min(1).max(255).optional(),
      city: z.string().min(1).max(255).optional(),
      address: z.string().min(1).max(500).optional(),
      mobile: z.string().min(1).max(20).optional(),
      email: z.string().email("Valid email is required").max(255).optional(),
      password: z.string().min(6, "Password must be at least 6 characters").max(255).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required",
    });

  const validatedData = await schema.parseAsync(req.body);

  const existing = await prisma.club.findUnique({ where: { id } });
  if (!existing) throw createError(404, "Club not found");

  // If password is being updated, hash it
  let dataToUpdate = { ...validatedData };
  if (validatedData.password) {
    dataToUpdate.password = await bcrypt.hash(validatedData.password, 10);
  }

  const updated = await prisma.club.update({
    where: { id },
    data: dataToUpdate,
  });

  // Return club without password
  const { password, ...clubResponse } = updated;
  res.json(clubResponse);
});

const deleteClub = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) throw createError(400, "Invalid club ID");

  const existing = await prisma.club.findUnique({ where: { id } });
  if (!existing) throw createError(404, "Club not found");

  await prisma.club.delete({ where: { id } });
  res.json({ message: "Club deleted successfully" });
});

module.exports = {
  getClubs,
  createClub,
  getClub,
  updateClub,
  deleteClub,
};
