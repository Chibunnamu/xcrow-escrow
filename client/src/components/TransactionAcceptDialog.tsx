import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";
import { type Transaction } from "@shared/schema";

interface TransactionAcceptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction;
  sellerName?: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const TransactionAcceptDialog = ({
  open,
  onOpenChange,
  transaction,
  sellerName,
  onAccept,
  onDecline,
}: TransactionAcceptDialogProps): JSX.Element => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center">
            <Rocket className="w-8 h-8 text-[#493d9e]" />
          </div>
          <DialogTitle className="text-xl font-bold">
            You've Been Invited to a Secure Deal!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex justify-between items-start">
            <div className="text-sm text-gray-600">Seller</div>
            <div className="text-right">
              {sellerName && <div className="font-medium text-gray-900">{sellerName}</div>}
              <div className="text-sm text-gray-600">{transaction.buyerEmail}</div>
            </div>
          </div>

          <div className="flex justify-between items-start">
            <div className="text-sm text-gray-600">Asset Name</div>
            <div className="font-medium text-gray-900">{transaction.itemName}</div>
          </div>

          <div className="flex justify-between items-start">
            <div className="text-sm text-gray-600">Price</div>
            <div className="font-medium text-gray-900">
              ₦{parseFloat(transaction.price).toLocaleString()}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-gray-700 text-center">
              Your funds will be securely held by Xcrow until you receive your asset. No risks, just smooth transactions!
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onAccept}
            className="flex-1 bg-[#493d9e] hover:bg-[#493d9e]/90"
          >
            Accept
          </Button>
          <Button
            onClick={onDecline}
            variant="outline"
            className="flex-1"
          >
            Decline
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
