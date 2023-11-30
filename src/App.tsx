import { Routes } from "@generouted/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStatus } from "./helpers";

const queryClient = new QueryClient();
export default function App() {
  const authStatus = useAuthStatus();
  return (
    <QueryClientProvider client={queryClient}>
      <nav>
        <ul>
          <li>
            <a href="/mpc2of2">2 of 2</a>
          </li>
          <li>
            <a href="/mpc2of3">2 of 3</a>
          </li>
        </ul>
      </nav>
      <h1>Pier Wallet MPC Demo</h1>
      <h2>Auth status: {authStatus}</h2>
      <Routes />
    </QueryClientProvider>
  );
}
