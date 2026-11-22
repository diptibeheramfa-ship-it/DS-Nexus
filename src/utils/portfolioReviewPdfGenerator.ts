import { jsPDF } from "jspdf";

export interface PortfolioReviewPdfData {
  clientName: string;
  ucc?: string;
  clientCode?: string;
  pan?: string;
  mobile?: string;
  email?: string;
  fiscalYear?: string;
  reviewDate?: string;
  reviewedBy?: string;
  portfolioObservation?: string;
  recommendedAction?: string;
  whatsappIntimation1?: string;
  whatsappIntimation2?: string;
  emailIntimation1?: string;
  emailIntimation2?: string;
}

export const generatePortfolioReviewPdf = (data: PortfolioReviewPdfData): void => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const leftMargin = 15;
  const rightMargin = 195;
  const contentWidth = rightMargin - leftMargin; // 180mm
  const centerX = 105;

  // -------------------------------------------------------------
  // 1. BRAND HEADER & LOGO
  // -------------------------------------------------------------
  // Centered Header Titles
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(20, 61, 102); // #143d66
  doc.text("D&S INVESTMENT", centerX, 22, { align: "center" });

  doc.setFontSize(12);
  doc.text("PORTFOLIO REVIEW REPORT", centerX, 28, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(data.fiscalYear || "FY 2026–27", centerX, 34, { align: "center" });

  // Top-Right Logo: Render from DOM if loaded or draw vector badge
  let hasDrawnLogo = false;
  try {
    const logoEl =
      typeof document !== "undefined"
        ? (document.getElementById("portfolio-review-company-logo") as HTMLImageElement)
        : null;
    if (logoEl && logoEl.complete && logoEl.naturalWidth > 0) {
      (doc as any).addImage(logoEl, "PNG", rightMargin - 22, 14, 22, 22);
      hasDrawnLogo = true;
    }
  } catch (e) {
    console.warn("Could not embed logo image in PDF:", e);
  }

  if (!hasDrawnLogo) {
    doc.setFillColor(15, 23, 42); // slate-900 card
    doc.roundedRect(rightMargin - 22, 14, 22, 22, 2.5, 2.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("D&S", rightMargin - 11, 26, { align: "center" });
  }

  // -------------------------------------------------------------
  // 2. SECTION 1: CLIENT INFORMATION
  // -------------------------------------------------------------
  let currY = 42;
  doc.setFillColor(20, 61, 102);
  doc.roundedRect(leftMargin, currY, contentWidth, 7.5, 0.5, 0.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("CLIENT INFORMATION", leftMargin + 4, currY + 5.2);

  currY += 7.5;
  const infoRowH = 8.5;
  const totalInfoH = infoRowH * 3;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.rect(leftMargin, currY, contentWidth, totalInfoH, "FD");

  // Dividers
  doc.line(leftMargin, currY + infoRowH, rightMargin, currY + infoRowH);
  doc.line(leftMargin, currY + infoRowH * 2, rightMargin, currY + infoRowH * 2);
  doc.line(centerX, currY, centerX, currY + totalInfoH);

  // Row 1
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Client Name", leftMargin + 4, currY + 5.5);
  doc.text("Review Date", centerX + 4, currY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.text(String(data.clientName || "-"), leftMargin + 35, currY + 5.5);
  doc.text(String(data.reviewDate || "-"), centerX + 35, currY + 5.5);

  // Row 2
  const r2Y = currY + infoRowH;
  doc.setFont("helvetica", "bold");
  doc.text("PAN", leftMargin + 4, r2Y + 5.5);
  doc.text("Reviewed By", centerX + 4, r2Y + 5.5);

  doc.setFont("helvetica", "normal");
  doc.text(String(data.pan || "-"), leftMargin + 35, r2Y + 5.5);
  doc.text(String(data.reviewedBy || "Soumyasri & Team"), centerX + 35, r2Y + 5.5);

  // Row 3
  const r3Y = currY + infoRowH * 2;
  doc.setFont("helvetica", "bold");
  doc.text("Mobile", leftMargin + 4, r3Y + 5.5);
  doc.text("E-mail", centerX + 4, r3Y + 5.5);

  doc.setFont("helvetica", "normal");
  doc.text(String(data.mobile || "-"), leftMargin + 35, r3Y + 5.5);
  doc.text(String(data.email || "-"), centerX + 35, r3Y + 5.5);

  currY += totalInfoH + 6;

  // -------------------------------------------------------------
  // 3. SECTION 2: PORTFOLIO OBSERVATION
  // -------------------------------------------------------------
  doc.setFillColor(20, 61, 102);
  doc.roundedRect(leftMargin, currY, contentWidth, 7.5, 0.5, 0.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("PORTFOLIO OBSERVATION", leftMargin + 4, currY + 5.2);

  currY += 7.5;
  const obsText = (data.portfolioObservation || "").trim();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const obsLines = obsText ? doc.splitTextToSize(obsText, contentWidth - 8) : [];
  const obsBoxH = Math.max(22, obsLines.length * 5 + 8);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.rect(leftMargin, currY, contentWidth, obsBoxH, "FD");
  if (obsLines.length > 0) {
    doc.text(obsLines, leftMargin + 4, currY + 6, { lineHeightFactor: 1.35 });
  }

  currY += obsBoxH + 6;

  // -------------------------------------------------------------
  // 4. SECTION 3: RECOMMENDED ACTION
  // -------------------------------------------------------------
  doc.setFillColor(20, 61, 102);
  doc.roundedRect(leftMargin, currY, contentWidth, 7.5, 0.5, 0.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("RECOMMENDED ACTION", leftMargin + 4, currY + 5.2);

  currY += 7.5;
  const actText = (data.recommendedAction || "").trim();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const actLines = actText ? doc.splitTextToSize(actText, contentWidth - 8) : [];
  const actBoxH = Math.max(22, actLines.length * 5 + 8);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.rect(leftMargin, currY, contentWidth, actBoxH, "FD");
  if (actLines.length > 0) {
    doc.text(actLines, leftMargin + 4, currY + 6, { lineHeightFactor: 1.35 });
  }

  currY += actBoxH + 6;

  // -------------------------------------------------------------
  // 5. SECTION 4: COMMUNICATION RECORD
  // -------------------------------------------------------------
  doc.setFillColor(20, 61, 102);
  doc.roundedRect(leftMargin, currY, contentWidth, 7.5, 0.5, 0.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("COMMUNICATION RECORD", leftMargin + 4, currY + 5.2);

  currY += 7.5;
  const commCol1W = 60;
  const commCol2W = 60;
  const commCol3W = 60;
  const commHeaderH = 7.5;
  const commRowH = 7.5;

  // Table Header
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(leftMargin, currY, contentWidth, commHeaderH, "FD");
  doc.line(leftMargin + commCol1W, currY, leftMargin + commCol1W, currY + commHeaderH);
  doc.line(leftMargin + commCol1W + commCol2W, currY, leftMargin + commCol1W + commCol2W, currY + commHeaderH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(20, 61, 102);
  doc.text("Communication Mode", leftMargin + 4, currY + 5);
  doc.text("1st Intimation", leftMargin + commCol1W + commCol2W / 2, currY + 5, { align: "center" });
  doc.text("2nd Intimation", leftMargin + commCol1W + commCol2W + commCol3W / 2, currY + 5, { align: "center" });

  // Row 1: WhatsApp
  const cRow1Y = currY + commHeaderH;
  doc.setFillColor(255, 255, 255);
  doc.rect(leftMargin, cRow1Y, contentWidth, commRowH, "FD");
  doc.line(leftMargin + commCol1W, cRow1Y, leftMargin + commCol1W, cRow1Y + commRowH);
  doc.line(leftMargin + commCol1W + commCol2W, cRow1Y, leftMargin + commCol1W + commCol2W, cRow1Y + commRowH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text("WhatsApp", leftMargin + 4, cRow1Y + 5);

  doc.setFont("helvetica", "normal");
  doc.text(
    String(data.whatsappIntimation1 || "16/09/2026"),
    leftMargin + commCol1W + commCol2W / 2,
    cRow1Y + 5,
    { align: "center" }
  );
  doc.text(
    String(data.whatsappIntimation2 || "DD/MM/YYYY"),
    leftMargin + commCol1W + commCol2W + commCol3W / 2,
    cRow1Y + 5,
    { align: "center" }
  );

  // Row 2: E-mail
  const cRow2Y = cRow1Y + commRowH;
  doc.rect(leftMargin, cRow2Y, contentWidth, commRowH, "FD");
  doc.line(leftMargin + commCol1W, cRow2Y, leftMargin + commCol1W, cRow2Y + commRowH);
  doc.line(leftMargin + commCol1W + commCol2W, cRow2Y, leftMargin + commCol1W + commCol2W, cRow2Y + commRowH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text("E-mail", leftMargin + 4, cRow2Y + 5);

  doc.setFont("helvetica", "normal");
  doc.text(
    String(data.emailIntimation1 || "16/09/2026"),
    leftMargin + commCol1W + commCol2W / 2,
    cRow2Y + 5,
    { align: "center" }
  );
  doc.text(
    String(data.emailIntimation2 || "DD/MM/YYYY"),
    leftMargin + commCol1W + commCol2W + commCol3W / 2,
    cRow2Y + 5,
    { align: "center" }
  );

  // Note
  const noteY = cRow2Y + commRowH + 4.5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Note: This report is prepared based on the portfolio information available as on the date of review.",
    leftMargin,
    noteY
  );

  // -------------------------------------------------------------
  // 6. FOOTER (Pinned to Bottom of Page)
  // -------------------------------------------------------------
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(leftMargin, 274, rightMargin, 274);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text("Address: E-49, Koel Nagar, Rourkela – 769014", centerX, 279, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    "Email: diptibehera.mfa@gmail.com   /   Contact No: 7008119358, 7735865901",
    centerX,
    283.5,
    { align: "center" }
  );

  // Clean filename and trigger direct download
  const cleanName = (data.clientName || "Client").replace(/\s+/g, "_");
  const cleanDate = (data.reviewDate || "Report").replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `Portfolio_Review_Report_${cleanName}_${cleanDate}.pdf`;

  doc.save(filename);
};
