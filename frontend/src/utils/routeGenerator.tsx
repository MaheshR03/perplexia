import { AnyRoute, createRoute, RootRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Outlet } from "@tanstack/react-router";

const pageModules = import.meta.glob("../pages/**/*.tsx", { eager: true });

export function generateRoutes(rootRoute: RootRoute) {
  // Create the layout route that will wrap all content
  const layoutRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "layout",
    component: () => (
      <AppLayout>
        <Outlet />
      </AppLayout>
    ),
  });

  const routes: AnyRoute[] = [];

  // Process page modules to create routes
  Object.entries(pageModules).forEach(([path, module]: [string, any]) => {
    if (!module.default) return;

    const filePathMatch = path.match(/\/pages\/(.+)\.tsx$/);
    if (!filePathMatch) return;

    let routePath = filePathMatch[1].toLowerCase();

    // Handle index route
    if (routePath === "index" || routePath === "landing") {
      routePath = "/";
    }
    // Handle dynamic routes
    else if (routePath.includes("[") && routePath.includes("]")) {
      routePath = "/" + routePath.replace(/\[(.+?)\]/g, "$$$1");
    }
    // Normal routes
    else {
      routePath = "/" + routePath;
    }

    const Component = module.default;

    routes.push(
      createRoute({
        getParentRoute: () => layoutRoute,
        path: routePath,
        component: Component,
      })
    );
  });

  // Return layout route with all child routes
  return { routes: [layoutRoute.addChildren(routes)] };
}
