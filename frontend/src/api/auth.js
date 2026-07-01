// ─────────────────────────────────────────────────────────────────────────────
// AUTH API — backed by mocks while the backend is offline.
// TO ENABLE THE REAL BACKEND:
//   1. Uncomment each `apiClient.*` line below.
//   2. Delete the mock implementation block underneath.
//   3. Delete the `import` from "@/mock/auth" + "@/mock/_helpers".
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from "./client";
// import { mockUser, loadMockUser, saveMockUser } from "@/mock/auth";
// import { mockDelay } from "@/mock/_helpers";

export const authApi = {
  register: (payload) =>
    apiClient.post("/auth/register", payload).then((r) => r.data),

  login: (payload) =>
    apiClient.post("/auth/login", payload).then((r) => r.data),

  logout: () => apiClient.post("/auth/logout").then((r) => r.data),

  me: () => apiClient.get("/auth/me").then((r) => r.data),

  updateProfile: (payload) =>
    apiClient.patch("/auth/profile", payload).then((r) => r.data),

  changePassword: (payload) =>
    apiClient.patch("/auth/password", payload).then((r) => r.data),
};
