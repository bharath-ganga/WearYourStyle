const commonStyles = {
    // default transition
    default_transition: "all 300ms ease-in-out",
    // font family
    font_family_inter: "'Manrope', 'Segoe UI', sans-serif",
};

const lightTheme = {
    ...commonStyles,
    // colors
    color_white: "#ffffff",
    color_black: "#151513",
    color_platinum: "#dedbd3",
    color_jet: "#23231f",
    color_yellow: "#e9a23b",
    color_yellow_green: "#7ad005",
    color_sea_green: "#d45b3f",
    color_sea_green_v1: "#c84e33",
    color_flash_white: "#f3f1eb",
    color_anti_flash_white: "#e9e5dc",
    color_purple: "#d45b3f",
    color_red: "#c4412d",
    color_gray: "#747169",
    color_dim_gray: "#5f5c55",
    color_outerspace: "#23231f",
    color_silver: "#b6b1a7",
    color_whitesmoke: "#f7f5ef",
    color_brown: "#b87545",
    color_black_04: "rgba(17, 17, 14, 0.46)",
};

const darkTheme = {
    ...commonStyles,
    // colors
    color_white: "#1e1e1e",
    color_black: "#fff",
    color_platinum: "#333",
    color_jet: "#eeeeee",
    color_yellow: "#fdc419",
    color_yellow_green: "#7ad005",
    color_sea_green: "#ef775b",
    color_sea_green_v1: "#ff876d",
    color_flash_white: "#121212",
    color_anti_flash_white: "#252525",
    color_purple: "#ef775b",
    color_red: "#cf6679",
    color_gray: "#a0a0a0",
    color_dim_gray: "#cccccc",
    color_outerspace: "#ffffff",
    color_silver: "#444444",
    color_whitesmoke: "#2a2a2a",
    color_brown: "#fb9f4c",
    color_black_04: "rgba(255, 255, 255, 0.1)",
};
  

  // media query
  const breakpoints = {
    xs: "480px",
    sm: "576px",
    md: "768px",
    lg: "992px",
    xl: "1200px",
    xxl: "1400px",
  };
  
  const defaultTheme = lightTheme;
export { lightTheme, darkTheme, defaultTheme, breakpoints };
