import { Roundcube } from ".";

export default {
  title: "Components/Roundcube",
  component: Roundcube,

  argTypes: {
    color: {
      options: ["black-matte"],
      control: { type: "select" },
    },
  },
};

export const Default = {
  args: {
    color: "black-matte",
    className: {},
  },
};
