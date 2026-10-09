import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ComingSoonProps {
  readonly title: string;
  readonly description: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>{title}: coming soon</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
