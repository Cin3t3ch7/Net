// ─── Users Routes ─────────────────────────────────────────────────────────────
import { Router } from "express"
import { z } from "zod"
import { authenticate } from "../../middlewares/auth.middleware"
import { requirePermission } from "../../middlewares/permission.middleware"
import { validateBody, validateParams } from "../../middlewares/validate.middleware"
import {
  handleListUsers,
  handleCreateUser,
  handleUpdateUser,
  handleDeleteUser,
  handleToggleSearchAny,
  handleUpdateEmails,
  createUserSchema,
  updateUserSchema,
  updateEmailsSchema,
} from "./users.controller"

const router = Router()

// ─── Shared param schema ──────────────────────────────────────────────────────
// Validates that :id is a well-formed UUID before hitting the repository.
// Prevents malformed inputs from triggering PG type cast errors.
const uuidParam = z.object({ id: z.string().uuid({ message: "ID inválido: debe ser un UUID válido." }) })

router.use(authenticate) // All user routes require a valid token

router.get(   "/",                requirePermission("users:read"),   handleListUsers)
router.post(  "/",                requirePermission("users:write"),  validateBody(createUserSchema),  handleCreateUser)
router.patch( "/:id",             requirePermission("users:write"),  validateParams(uuidParam), validateBody(updateUserSchema),  handleUpdateUser)
router.delete("/:id",             requirePermission("users:delete"), validateParams(uuidParam), handleDeleteUser)
router.patch( "/:id/search-any",  requirePermission("users:write"),  validateParams(uuidParam), handleToggleSearchAny)
router.patch( "/:id/emails",      requirePermission("users:write"),  validateParams(uuidParam), validateBody(updateEmailsSchema), handleUpdateEmails)

export default router
