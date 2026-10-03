import type { FC } from "react";

import { Center, Loader } from "@mantine/core";

export const LoadingOverlay: FC = () => {
  return (
    <Center h={"100vh"}>
      <Loader size={"lg"} />
    </Center>
  );
};
