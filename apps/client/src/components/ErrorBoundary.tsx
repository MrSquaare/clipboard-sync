import { Alert, Container, Title, Text, Button, Center } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container size="sm" py="xl">
          <Center h="100vh">
            <Alert
              variant="light"
              color="red"
              title="Application Error"
              icon={<IconAlertCircle />}
            >
              <Title order={4} mb="md">
                Something went wrong
              </Title>
              <Text size="sm" mb="lg">
                {this.state.error?.message || "An unexpected error occurred."}
              </Text>
              <Button
                variant="outline"
                color="red"
                onClick={() => window.location.reload()}
              >
                Reload Application
              </Button>
            </Alert>
          </Center>
        </Container>
      );
    }

    return this.props.children;
  }
}
