import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthContext, type AuthContextValue } from "@/features/auth/authContext";
import type { User } from "@/types/models";
import type { UserType } from "@/types/enums";
import { RequireAuth, RequireRole } from "./guards";

function makeUser(type: UserType): User {
  return {
    _id: "u1",
    firstName: "Test",
    lastName: "User",
    email: "t@example.com",
    type,
    status: "ACTIVE",
    universityId: "uni",
  };
}

function renderAt(path: string, user: User | null | undefined, isChecking = false) {
  const value: AuthContextValue = {
    user,
    isChecking,
    login: async () => makeUser("ADMIN"),
    logout: async () => undefined,
  };
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route element={<RequireAuth />}>
            <Route path="/student" element={<RequireRole roles={["STUDENT"]} />}>
              <Route index element={<p>student home</p>} />
            </Route>
            <Route path="/admin" element={<RequireRole roles={["ADMIN"]} />}>
              <Route index element={<p>admin home</p>} />
            </Route>
            <Route path="/instructor" element={<RequireRole roles={["INSTRUCTOR"]} />}>
              <Route index element={<p>instructor home</p>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("route guards", () => {
  it("sends logged-out visitors to the login page", () => {
    renderAt("/admin", null);
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("shows a loading state while the session is being checked", () => {
    renderAt("/admin", undefined, true);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("lets the right role in", () => {
    renderAt("/admin", makeUser("ADMIN"));
    expect(screen.getByText("admin home")).toBeInTheDocument();
  });

  it("sends the wrong role to its own home page", () => {
    renderAt("/admin", makeUser("STUDENT"));
    expect(screen.getByText("student home")).toBeInTheDocument();
    expect(screen.queryByText("admin home")).not.toBeInTheDocument();
  });

  it("keeps instructors out of the student area", () => {
    renderAt("/student", makeUser("INSTRUCTOR"));
    expect(screen.getByText("instructor home")).toBeInTheDocument();
  });
});
