export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const colorPalette = [
  { bg: "#CAD6F2", text: "#4318FF" },
  { bg: "#E2FBE8", text: "#337F3F" },
  { bg: "#F9E8F3", text: "#C64C7F" },
  { bg: "#DFCEF3", text: "#6325A9" },
  { bg: "#FBD693", text: "#BE800F" },
];

export const getAvatarColors = (id: number): { bg: string; text: string } => {
  const colorIndex = id % colorPalette.length;
  return colorPalette[colorIndex];
};
