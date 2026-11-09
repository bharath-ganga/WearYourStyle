import PropTypes from "prop-types";

// Product colours are stored as hex codes; show them as a swatch rather than "#6B6B2F".
const isHex = (value) => /^#[0-9a-f]{3,8}$/i.test(String(value || ""));

const ColorSwatch = ({ color }) => {
  if (!color) return <span>—</span>;
  if (!isHex(color)) return <span>{color}</span>;
  return (
    <span
      title={color}
      aria-label={`Colour ${color}`}
      style={{ display: "inline-block", width: 14, height: 14, background: color, border: "1px solid #c9c5bc", verticalAlign: "middle" }}
    />
  );
};

ColorSwatch.propTypes = { color: PropTypes.string };

export default ColorSwatch;
