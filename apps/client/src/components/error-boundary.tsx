import type { ReactNode } from "react";

import { Alert, Button, Stack, Text, Title } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Component } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, hasError: true };
  }

  handleReload = (): void => {
    location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Stack align={"center"} h={"100vh"} justify={"center"} p={"xl"}>
          <IconAlertTriangle color={"var(--mantine-color-red-5)"} size={64} />
          <Title order={2}>Something went wrong</Title>
          <Alert color={"red"} maw={500} w={"100%"}>
            <Text size={"sm"} style={{ fontFamily: "monospace" }}>
              {this.state.error?.message ?? "Unknown error"}
            </Text>
          </Alert>
          <Button color={"gray"} onClick={this.handleReload} variant={"light"}>
            Reload
          </Button>
        </Stack>
      );
    }

    return this.props.children;
  }
}
