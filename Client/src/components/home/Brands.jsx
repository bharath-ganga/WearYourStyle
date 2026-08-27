import styled from "styled-components";
import { Container, Section, TitleWrapper } from "../../styles/styles";
import { brandsData } from "../../data/data";
import { breakpoints, defaultTheme } from "../../styles/themes/default";

const StyledSectionTitle = styled(TitleWrapper)`
  padding-left: 0;
  &::after {
    display: none;
  }

  @media (max-width: ${breakpoints.sm}) {
    margin-bottom: 20px;
  }
`;

const BrandsContent = styled.div`
  border-radius: 24px;
  padding: 64px 20px;
  background-color: ${(props) => props.theme.color_white};
  border: 1px solid ${(props) => props.theme.color_anti_flash_white};

  @media (max-width: ${breakpoints.lg}) {
    padding: 40px 20px;
  }
`;

const BrandsListWrapper = styled.div`
  padding: 12px;
  margin-top: 40px;
  gap: 24px;

  @media (max-width: ${breakpoints.sm}) {
    gap: 12px;
    margin-top: 20px;
  }
`;

const BrandsItemWrapper = styled.div`
  width: 180px;
  height: auto;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
  }

  .brand-img-wrap {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
  }

  img {
    max-width: 120px;
    max-height: 50px;
    object-fit: contain;
    filter: grayscale(1);
    opacity: 0.7;
    transition: all 0.3s ease;
  }

  &:hover img {
    filter: grayscale(0);
    opacity: 1;
  }

  .brand-name {
      font-size: 14px;
      font-weight: 600;
      color: ${(props) => props.theme.color_dim_gray};
      text-transform: uppercase;
      letter-spacing: 1px;
  }

  @media (max-width: ${breakpoints.sm}) {
    width: 130px;
  }

  @media (max-width: ${breakpoints.xs}) {
    width: 100px;
  }
`;

const Brands = () => {
  return (
    <Section>
      <Container>
        <BrandsContent>
          <StyledSectionTitle className="text-center justify-center flex-col">
            <h2 className="text-4xl font-bold" style={{ marginBottom: '8px' }}>Top Brands Deal</h2>
            <p className="text-lg font-medium text-gray">
              Up to <span className="text-yellow" style={{ color: '#fdc419', fontWeight: 'bold' }}>60%</span> off on brands.
            </p>
          </StyledSectionTitle>
          <BrandsListWrapper className="flex items-center flex-wrap justify-center">
            {brandsData?.map((brand) => {
              return (
                <BrandsItemWrapper
                  key={brand.id}
                >
                  <div className="brand-img-wrap">
                    <img src={brand.imgSource} alt={brand.name} />
                  </div>
                  <span className="brand-name">{brand.name}</span>
                </BrandsItemWrapper>
              );
            })}
          </BrandsListWrapper>
        </BrandsContent>
      </Container>
    </Section>
  );
};

export default Brands;
