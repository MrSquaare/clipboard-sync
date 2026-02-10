import { Center, Loader } from "@mantine/core";
import type { FC } from "react";

export const LoadingOverlay: FC = () => {
  return (
    <Center h={"100vh"}>
      <Loader size={"lg"} />
    </Center>
  );
};
