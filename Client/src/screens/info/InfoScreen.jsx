import { Link, useParams } from "react-router-dom";
import styled from "styled-components";
import { Container } from "../../styles/styles";

const Page = styled.main`
  padding: 72px 0 96px;
  .eyebrow { color: #d45b3f; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
  h1 { max-width: 760px; margin: 12px 0 18px; font-size: clamp(38px, 6vw, 72px); line-height: 1; }
  .lead { max-width: 720px; font-size: 19px; line-height: 1.7; color: #616666; }
  .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; margin-top: 42px; }
  article { border: 1px solid #dedbd3; border-radius: 18px; padding: 24px; background: var(--color-white, #fff); }
  article h2 { font-size: 20px; margin-bottom: 10px; }
  article p { color: #616666; line-height: 1.65; }
  .cta { display: inline-flex; margin-top: 34px; padding: 13px 20px; border-radius: 999px; background: #263333; color: #fff; font-weight: 700; }
`;

const pages = {
  contact: ["Contact us", "Real people, practical help.", [
    ["Customer care", "Email support@wearyourstyle.com or call +91 80000 12345, Monday–Saturday, 9am–7pm IST."],
    ["Order help", "Keep your order number ready so our team can find the right shipment quickly."],
    ["Style support", "Need help with fit or outfit pairing? Share the occasion and the pieces you already own."],
  ]],
  returns_refunds: ["Returns & refunds", "Simple returns, clear timelines.", [["30-day window", "Return eligible, unworn items with tags within 30 days of delivery."], ["Easy pickup", "Request a return from Order details. Pickup availability depends on your postcode."], ["Refund timing", "Approved refunds are initiated to the original method within 5–7 working days."]]],
  faqs: ["Frequently asked questions", "Everything you need before you shop.", [["How does try-on work?", "Upload a clear front-facing photo and choose an eligible top. Images are used only to create your preview."], ["Can I change an order?", "Orders can be cancelled before dispatch from your order details page."], ["How do I find my size?", "Save your measurements in your profile and compare the recommendation on product pages."]]],
  shipping: ["Shipping", "Tracked delivery across India.", [["Dispatch", "In-stock orders usually leave our fulfilment centre within 1–2 working days."], ["Delivery", "Most postcodes receive orders within 3–7 working days."], ["Free shipping", "Standard delivery is free on orders above ₹999."]]],
  privacy: ["Privacy", "Your wardrobe, your data.", [["Account data", "We store only the information needed to run your account and fulfil orders."], ["Try-on images", "Generated previews remain on your device unless you explicitly save or share them."], ["Your controls", "You can update profile data and request account deletion through customer care."]]],
  tac: ["Terms & conditions", "Straightforward rules for using WearYourStyle.", [["Orders", "An order is confirmed after inventory and payment validation."], ["Content", "Uploaded photos must belong to you or be used with permission."], ["Fair use", "Automated abuse, fraudulent transactions, and unlawful uploads are prohibited."]]],
  career: ["Careers", "Build the future of personal style.", [["Product & design", "Create calm, useful shopping experiences."], ["Engineering", "Work across commerce, computer vision, and responsible AI."], ["Operations", "Help customers receive the right item at the right time."]]],
  blog: ["The Style Journal", "Practical ideas for a wardrobe that works harder.", [["Capsule wardrobe", "Start with versatile layers, consistent colour families, and pieces you genuinely repeat."], ["Fit first", "Use garment measurements, not just the label, when comparing brands."], ["Occasion edits", "Build an outfit around one anchor piece, then add contrast through texture or colour."]]],
  media: ["Press & media", "WearYourStyle news and brand resources.", [["Press enquiries", "Contact press@wearyourstyle.com for interviews and company information."], ["Brand assets", "Request approved logos, product imagery, and founder biographies."], ["Partnerships", "We collaborate with responsible brands, stylists, and creators."]]],
  sitemap: ["Sitemap", "Find your way around.", [["Shop", "Browse products, product details, wishlist, cart, and checkout."], ["Style tools", "Use virtual try-on, your digital wardrobe, and outfit recommendations."], ["Account", "Manage profile, addresses, orders, returns, and preferences."]]],
};

const InfoScreen = () => {
  const { page } = useParams();
  const [title, lead, cards] = pages[page] || pages.faqs;
  return <Page><Container><span className="eyebrow">WearYourStyle guide</span><h1>{title}</h1><p className="lead">{lead}</p><div className="info-grid">{cards.map(([heading, copy]) => <article key={heading}><h2>{heading}</h2><p>{copy}</p></article>)}</div><Link className="cta" to="/product">Continue shopping</Link></Container></Page>;
};

export default InfoScreen;
