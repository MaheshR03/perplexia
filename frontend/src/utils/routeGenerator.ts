import { Route } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Outlet } from "@tanstack/react-router";

// This uses Vite's import.meta.glob to dynamically import all page components
const pageModules = import.meta.glob("../pages/**/*.tsx", { eager: true });

// Helper function to generate routes from pages
export function generateRoutes(rootRoute: any) {
  // Define layout route for protected routes
  const layoutRoute = new Route({
    getParentRoute: () => rootRoute,
    id: "layout",
    component: () => (
      <AppLayout>
        <Outlet />
      </AppLayout>
    ),
  });

  const publicRoutes = [];
  const protectedRoutes = [];

  // Process all page modules
  Object.entries(pageModules).forEach(([path, module]) => {
    // Skip if no default export (component)
    if (!module.default) return;

    // Extract page name and path from file path
    const filePathMatch = path.match(/\/pages\/(.+)\.tsx$/);
    if (!filePathMatch) return;

    let routePath = filePathMatch[1].toLowerCase();

    // Handle index pages
    if (routePath === "landing" || routePath === "index") {
      routePath = "/";
    }
    // Handle dynamic routes
    else if (routePath.includes("[") && routePath.includes("]")) {
      routePath = "/" + routePath.replace(/\[(.+)\]/g, "$$$1");
    }
    // Normal routes
    else {
      routePath = "/" + routePath;
    }

    // Special case for chat/:id
    if (routePath.includes("chat/")) {
      routePath = routePath.replace("chat/id", "chat/$sessionId");
    }

    const Component = module.default;

    // Determine if this is a protected route (needs layout)
    const isProtected = !["/", "/login", "/auth-callback"].includes(routePath);

    if (isProtected) {
      protectedRoutes.push(
        new Route({
          getParentRoute: () => layoutRoute,
          path: routePath,
          component: Component,
        })
      );
    } else {
      publicRoutes.push(
        new Route({
          getParentRoute: () => rootRoute,
          path: routePath,
          component: Component,
        })
      );
    }
  });

  // Combine public routes with layout route (which contains protected routes)
  const pageRoutes = [
    ...publicRoutes,
    layoutRoute.addChildren(protectedRoutes),
  ];

  return { routes: pageRoutes, layoutRoute };
}
