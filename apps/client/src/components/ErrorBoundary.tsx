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
        <Container py={"xl"} size={"sm"}>
          <Center h={"100vh"}>
            <Alert
              color={"red"}
              icon={<IconAlertCircle />}
              title={"Application Error"}
              variant={"light"}
            >
              <Title mb={"md"} order={4}>
                Something went wrong
              </Title>
              <Text mb={"lg"} size={"sm"}>
                {this.state.error?.message || "An unexpected error occurred."}
              </Text>
              <Button
                color={"red"}
                onClick={() => window.location.reload()}
                variant={"outline"}
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
