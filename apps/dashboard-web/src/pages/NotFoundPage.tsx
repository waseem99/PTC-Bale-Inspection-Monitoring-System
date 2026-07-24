import { AppShell, Icon } from '../components';
import { Link } from '../router';

export default function NotFoundPage() {
  return <AppShell title="Page Not Found"><section className="not-found"><Icon name="warning" size={42}/><h2 tabIndex={-1}>This dashboard page does not exist.</h2><p>Use the main navigation or return to the operational overview.</p><Link className="button button--primary" to="/overview">Return to overview <Icon name="arrow" size={18}/></Link></section></AppShell>;
}
