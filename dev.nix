{ pkgs, ... }: {
  packages = [
    pkgs.python3
  ];
  previews = [
    {
      command = "python3 -m http.server 8080";
      port = 8080;
    }
  ];
}