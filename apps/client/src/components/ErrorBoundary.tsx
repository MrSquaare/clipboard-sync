import { Alert, Box, Title, Text, Button, Center, Code } from "@mantine/core";
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
        <Center h={"100vh"} p={"md"}>
          <Box maw={800} w={"100%"}>
            <Alert
              color={"red"}
              icon={<IconAlertCircle />}
              title={<Title order={4}>Something went wrong</Title>}
              variant={"light"}
            >
              <Text mb={"lg"}>
                <Code>
                  {this.state.error?.message || "An unexpected error occurred."}
                </Code>
              </Text>
              <Button
                color={"red"}
                onClick={() => window.location.reload()}
                variant={"outline"}
              >
                Restart
              </Button>
            </Alert>
          </Box>
        </Center>
      );
    }

    return this.props.children;
  }
}
