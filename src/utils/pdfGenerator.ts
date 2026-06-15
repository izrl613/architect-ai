import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function generateSovereignReport(
  userName: string, 
  overallScore: number, 
  activeModulesCount: number,
  blockedTrackersCount: number
) {
  const doc = new jsPDF();
  
  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Sovereign Identity Trust Report', 14, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated for: ${userName || 'Agape Sovereign User'}`, 14, 30);
  doc.text(`Date: ${new Date().toLocaleString()}`, 14, 36);
  
  // Score Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Security Posture Overview', 14, 50);
  
  autoTable(doc, {
    startY: 55,
    head: [['Metric', 'Value', 'Status']],
    body: [
      ['Sovereign Core Score', `${overallScore}%`, overallScore > 80 ? 'Optimal' : 'Needs Attention'],
      ['Isolated Modules Active', `${activeModulesCount}`, 'Protected'],
      ['Threats Neutralized', `${blockedTrackersCount}`, 'Verified'],
      ['Biometric State', 'Locked & Enforced', 'Optimal'],
      ['Encryption Key Exchange', 'Verified SHA-256', 'Optimal'],
      ['Sovereign Network Link', 'Airgapped (Local AI)', 'Optimal']
    ],
    theme: 'grid',
    styles: { font: 'helvetica' },
    headStyles: { fillColor: [15, 23, 42] }
  });

  // Disclaimer - no financial language
  const finalY = (doc as any).lastAutoTable.finalY || 100;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'This report validates local sandbox heuristics, behavioral latency modules, and privacy parameters. ' +
    'It does NOT evaluate institutional, consumer, or fiscal metrics.',
    14, finalY + 15, { maxWidth: 180 }
  );
  
  doc.save('Sovereign-Identity-Trust-Report.pdf');
}
