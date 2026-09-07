import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingBag, Minus, Plus, Trash2, Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { formatPrice } from "@/lib/shopify";
import { track } from "@/lib/analytics";


export function CartDrawer() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { items, isLoading, isSyncing, updateQuantity, removeItem, syncCart } = useCartStore();
  const total = items.reduce((s, i) => s + parseFloat(i.price.amount) * i.quantity, 0);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const currency = items[0]?.price.currencyCode ?? "BRL";

  useEffect(() => { if (open) syncCart(); }, [open, syncCart]);

  const checkout = () => {
    if (items.length === 0) return;
    track.beginCheckout({
      value: total,
      currency,
      items: items.map((i) => ({
        id: i.product.node.id,
        name: i.product.node.title,
        price: parseFloat(i.price.amount),
        quantity: i.quantity,
      })),
    });
    setOpen(false);
    navigate({ to: "/checkout" });
  };



  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 hover:opacity-70 transition" aria-label="Sacola">
          <ShoppingBag className="h-5 w-5" strokeWidth={1.25} />
          {totalItems > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-foreground text-background text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-medium">
              {totalItems}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col bg-background border-l">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl font-normal tracking-tight">Sua Sacola</SheetTitle>
          <span className="gold-rule mt-2" />
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" strokeWidth={1} />
            <p className="text-sm text-muted-foreground">Sua sacola está vazia.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-1 py-6 space-y-6">
              {items.map((item) => {
                const img = item.product.node.images?.edges?.[0]?.node;
                return (
                  <div key={item.variantId} className="flex gap-4">
                    <div className="w-20 h-28 bg-secondary overflow-hidden flex-shrink-0">
                      {img && <img src={img.url} alt={img.altText ?? item.product.node.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="font-display text-base leading-tight truncate">{item.product.node.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{item.selectedOptions.map((o) => o.value).join(" · ")}</p>
                        <p className="text-sm mt-2">{formatPrice(item.price.amount, item.price.currencyCode)}</p>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border border-border">
                          <button className="p-1.5 hover:bg-secondary" onClick={() => updateQuantity(item.variantId, item.quantity - 1)} aria-label="Diminuir">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <button className="p-1.5 hover:bg-secondary" onClick={() => updateQuantity(item.variantId, item.quantity + 1)} aria-label="Aumentar">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button onClick={() => removeItem(item.variantId)} className="text-muted-foreground hover:text-foreground" aria-label="Remover">
                          <Trash2 className="h-4 w-4" strokeWidth={1.25} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t pt-6 space-y-4">
              <div className="flex justify-between text-xs uppercase tracking-widest">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(total, currency)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Frete e impostos calculados no checkout.</p>
              <Button onClick={checkout} disabled={isLoading || isSyncing} variant="gold" size="xl" className="w-full">
                {isLoading || isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalizar Compra"}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
