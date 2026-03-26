const fs = require('fs');
const file = 'c:/Users/defaultuser0/Desktop/buoyance/buoyance-main/src/pages/TaxClearance.tsx';
let d = fs.readFileSync(file, 'utf8');

d = d.replace(
    'toast({ title: "TCC Request Initiated", description: "Your profile has entered the compliance processing queue." });',
    'toast({ title: "TCC Request Initiated", description: "Your profile has entered the compliance processing queue." });\n            setIsUploadDialogOpen(false);'
);

const oldUpload = \`            toast({ title: "Uploading receipt...", description: "Securely transmitting to storage." });

            const { error } = await supabase
                .from('tcc_requests' as any)
                .update({ status: 'processing', remita_rrr: \\\`RMR-\${Math.random().toString().slice(2, 10)}\\\` })
                .eq('id', tccId);\`;

const newUpload = \`            toast({ title: "Uploading receipt...", description: "Securely transmitting to storage." });
            
            const filePath = \\\`\${activeWorkspace.id}/tcc/\${tccId}/\${file.name}\\\`;
            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(filePath, file);
                
            if (uploadError) throw uploadError;
            
            const { data: publicUrlData } = supabase.storage
                .from('receipts')
                .getPublicUrl(filePath);

            const { error } = await supabase
                .from('tcc_requests' as any)
                .update({ 
                    status: 'processing', 
                    remita_rrr: file.name, 
                    tcc_document_url: publicUrlData.publicUrl 
                })
                .eq('id', tccId);\`;

d = d.replace(oldUpload, newUpload);
d = d.replace('<Dialog>', '<Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>');

fs.writeFileSync(file, d);
console.log('Done!');
