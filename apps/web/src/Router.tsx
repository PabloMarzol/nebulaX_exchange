import { Route, Switch, useLocation } from 'wouter';
import { AppShell } from './components/layout/AppShell';

// Pages
import { HomePage } from './pages/HomePage';
import { TradingPage } from './pages/TradingPage';
import { SwapPage } from './pages/SwapPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function Router() {
  const [location] = useLocation();
  const isHomePage = location === '/';

  return (
    <AppShell fullWidth={isHomePage}>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/trading" component={TradingPage} />
        <Route path="/trading/:symbol" component={TradingPage} />
        <Route path="/swap" component={SwapPage} />
        <Route path="/portfolio" component={PortfolioPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </AppShell>
  );
}
