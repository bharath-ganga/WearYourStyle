import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

const TrackerWrapper = styled.div`
  width: 100%;
  padding: 10px 0;
  margin: 10px 0;
  box-sizing: border-box;

  ${props => props.$compact && `
    margin: 0;
    padding: 0;
  `}
`;

const ProgressBarContainer = styled.div`
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  max-width: ${props => props.$compact ? '100%' : '600px'};
  margin: 0 auto;
  width: 100%;
  padding-bottom: ${props => props.$compact ? '30px' : '50px'}; 
`;

const BackgroundLine = styled.div`
  position: absolute;
  top: ${props => props.$compact ? '10px' : '14px'};
  transform: translateY(-50%);
  left: 0;
  right: 0;
  height: 4px;
  background-color: #e5e7eb; /* gray-200 */
  z-index: 1;
  border-radius: 2px;
`;

const ProgressFill = styled.div`
  position: absolute;
  top: ${props => props.$compact ? '10px' : '14px'};
  transform: translateY(-50%);
  left: 0;
  height: 4px;
  background-color: #3b82f6; /* blue-500 */
  z-index: 2;
  border-radius: 2px;
  width: ${props => props.$width}%;
  transition: width 1.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
`;

const StepWrapper = styled.div`
  position: relative;
  z-index: 5;
  display: flex;
  justify-content: center;
`;

const StepIcon = styled.div`
  width: ${props => props.$compact ? '20px' : '28px'};
  height: ${props => props.$compact ? '20px' : '28px'};
  border-radius: 50%;
  background-color: ${props => props.$active ? '#3b82f6' : '#fff'};
  border: ${props => props.$active ? 'none' : '3px solid #d1d5db'};
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.4s ease;
  transition-delay: ${props => props.$delay}s;
  color: white;
  box-shadow: ${props => props.$active ? '0 0 8px rgba(59, 130, 246, 0.6)' : '0 0 0 2px #fff inset'};

  .check-icon {
    opacity: ${props => props.$active ? 1 : 0};
    transform: scale(${props => props.$active ? 1 : 0.5});
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    transition-delay: ${props => props.$delay + 0.15}s;
    font-size: ${props => props.$compact ? '12px' : '16px'};
    font-weight: bold;
    line-height: 1;
  }
`;

const StepLabel = styled.div`
  position: absolute;
  top: ${props => props.$compact ? '26px' : '38px'};
  font-size: ${props => props.$compact ? '11px' : '14px'};
  font-weight: ${props => props.$active ? '700' : '500'};
  color: ${props => props.$active ? '#111827' : '#6b7280'};
  text-align: center;
  white-space: nowrap;
  left: 50%;
  transform: translateX(-50%);
  transition: color 0.3s ease;
`;

const OrderStatusTracker = ({ currentStatus, compact = false }) => {
  const [fillWidth, setFillWidth] = useState(0);
  const [activeSteps, setActiveSteps] = useState([false, false, false, false]);

  const steps = ["Ordered", "Shipped", "Out for delivery", "Delivered"];
  
  const normalizedStatus = 
    currentStatus === "Order Placed" || currentStatus === "pending" ? "Ordered" : currentStatus;

  useEffect(() => {
    let targetIndex = steps.indexOf(normalizedStatus);
    if (normalizedStatus === "Cancelled") targetIndex = -1; 

    if (targetIndex >= 0) {
       const percentagePerStep = 100 / (steps.length - 1);
       const targetWidth = targetIndex * percentagePerStep;
       
       const timeoutId = setTimeout(() => {
           setFillWidth(targetWidth);
           const newActiveSteps = steps.map((_, i) => i <= targetIndex);
           setActiveSteps(newActiveSteps);
       }, 50);
       
       return () => clearTimeout(timeoutId);
    }
  }, [normalizedStatus]);

  if (normalizedStatus === "Cancelled") {
      return (
          <TrackerWrapper $compact={compact}>
              <div style={{ color: '#ef4444', fontWeight: 'bold', textAlign: 'center', fontSize: compact ? '12px' : '16px', paddingBottom: compact ? '0' : '20px' }}>
                  <span style={{marginRight: '6px'}}>✖</span> Order Cancelled
              </div>
          </TrackerWrapper>
      );
  }

  return (
    <TrackerWrapper $compact={compact}>
      <ProgressBarContainer $compact={compact}>
        <BackgroundLine $compact={compact} />
        <ProgressFill $width={fillWidth} $compact={compact} />
        
        {steps.map((label, index) => {
           const isActive = activeSteps[index];
           const targetIndex = steps.indexOf(normalizedStatus);
           const delay = (index <= targetIndex) ? index * 0.25 : 0; 
           
           return (
               <StepWrapper key={label}>
                   <StepIcon $active={isActive} $compact={compact} $delay={delay}>
                       <span className="check-icon">✓</span>
                   </StepIcon>
                   <StepLabel $active={isActive} $compact={compact}>{label}</StepLabel>
               </StepWrapper>
           );
        })}
      </ProgressBarContainer>
    </TrackerWrapper>
  );
};

export default OrderStatusTracker;
