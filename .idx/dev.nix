{ pkgs, ... }: {
  channel = "stable-23.11";
  packages = [
    pkgs.nodejs_20
  ];
  idx = {
    extensions = [];
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npx" "-y" "http-server" "." "-p" "$PORT" "-a" "0.0.0.0"];
          manager = "web";
        };
      };
    };
  };
}