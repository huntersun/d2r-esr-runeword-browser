import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openSignInDialog, selectIsAuthenticated } from '@/features/auth';

/** "Create Build": links to the editor when signed in, otherwise opens the sign-in dialog. */
export function CreateBuildButton() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  if (isAuthenticated) {
    return (
      <Button asChild>
        <Link to="/builds/new">
          <Plus className="size-4" />
          Create Build
        </Link>
      </Button>
    );
  }

  return (
    <Button
      onClick={() => {
        dispatch(openSignInDialog());
      }}
    >
      <Plus className="size-4" />
      Create Build
    </Button>
  );
}
