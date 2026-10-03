import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '../../services/storage';
import { ReturnService } from '../../services/returnService';
import { ProductService } from '../../services/productService';
import { Product } from '../../types';
import { Card, CardHeader, CardContent, CardFooter } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/common/Input';
import { useToast } from '../../context/ToastContext';
import {
  Package,
  FileText,
  Camera,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Trash2,
  Star,
  Info,
  Plus,
} from 'lucide-react';

export const NewReturnPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const state = StorageService.getState();
  const [productList, setProductList] = useState<Product[]>(state.products);
  const hubs = state.hubs;

  // Step 1: Product Information
  const [selectedSku, setSelectedSku] = useState(state.products[0]?.sku || '');
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [customSku, setCustomSku] = useState(`SKU-NEW-${Math.floor(100 + Math.random() * 900)}`);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Consumer Electronics');
  const [customBrand, setCustomBrand] = useState('');
  const [customVariant, setCustomVariant] = useState('Standard Edition');
  const [customPrice, setCustomPrice] = useState('149.99');
  const [customImageUrl, setCustomImageUrl] = useState('');

  const [quantity, setQuantity] = useState('1');
  const [orderReference, setOrderReference] = useState(`ORD-WA-${Math.floor(10000 + Math.random() * 90000)}`);
  const [hubId, setHubId] = useState(hubs[0]?.id || '');
  const [returnReason, setReturnReason] = useState('Customer reports ergonomic fit issue, requested exchange');

  useEffect(() => {
    ProductService.getProducts().then(data => {
      if (data && data.length > 0) {
        setProductList(data);
        if (!selectedSku) setSelectedSku(data[0].sku);
      }
    });
  }, []);

  // Step 2: Condition Information
  const [reportedCondition, setReportedCondition] = useState<'like_new' | 'minor_wear' | 'damaged' | 'defective' | 'unopened'>('like_new');
  const [packagingCondition, setPackagingCondition] = useState<'intact' | 'opened_good' | 'damaged' | 'missing'>('opened_good');
  const [accessoryCompleteness, setAccessoryCompleteness] = useState<'complete' | 'partial' | 'missing'>('complete');
  const [knownDamage, setKnownDamage] = useState('None visible to customer; minor box scuff');
  const [initialFunctionalNotes, setInitialFunctionalNotes] = useState('Powers on normally, LED illuminates');

  // Step 3: Product Images
  const selectedProduct = productList.find(p => p.sku === selectedSku) || productList[0];
  const [images, setImages] = useState<{ id: string; url: string; caption: string; isPrimary: boolean }[]>([
    {
      id: 'img-seed-1',
      url: selectedProduct?.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&auto=format&fit=crop&q=80',
      caption: 'Front profile & casing view',
      isPrimary: true,
    },
  ]);

  const handleProceedFromStep1 = async () => {
    if (isCustomProduct) {
      if (!customName.trim()) {
        showToast({ title: 'Product Name Required', description: 'Please enter a name for the new product.', type: 'warning' });
        return;
      }
      if (!customSku.trim()) {
        showToast({ title: 'SKU Required', description: 'Please enter a unique SKU identifier.', type: 'warning' });
        return;
      }
      const priceNum = parseFloat(customPrice);
      if (isNaN(priceNum) || priceNum <= 0) {
        showToast({ title: 'Invalid Price', description: 'Please enter a valid price.', type: 'warning' });
        return;
      }

      try {
        const createdProd = await ProductService.createProduct({
          sku: customSku.trim().toUpperCase(),
          name: customName.trim(),
          category: customCategory,
          brand: customBrand.trim() || 'Generic Brand',
          variant: customVariant.trim() || 'Standard Edition',
          sellingPrice: priceNum,
          originalPrice: Math.round(priceNum * 1.35),
          returnEligibilityPolicy: 'Standard 30-day return policy. Mandatory QA sign-off.',
          inspectionRequirements: [
            'Physical casing integrity check',
            'Functional hardware response test',
            'Sanitization verification',
          ],
          active: true,
          imageUrl: customImageUrl.trim() || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&auto=format&fit=crop&q=80',
        });

        setProductList(prev => [...prev.filter(p => p.sku !== createdProd.sku), createdProd]);
        setSelectedSku(createdProd.sku);
        setImages([
          {
            id: `img-${Date.now()}`,
            url: createdProd.imageUrl,
            caption: `${createdProd.name} initial condition intake`,
            isPrimary: true,
          },
        ]);
        showToast({
          title: 'New Product Registered',
          description: `Added "${createdProd.name}" (${createdProd.sku}) to catalog and selected for return.`,
          type: 'success',
        });
        setCurrentStep(2);
      } catch (err: any) {
        showToast({ title: 'Failed to register product', description: err.message, type: 'error' });
      }
    } else {
      if (!selectedSku || selectedSku === '__NEW_PRODUCT__') {
        showToast({ title: 'Product Required', description: 'Please select an existing catalog product or enter a new one.', type: 'warning' });
        return;
      }
      setCurrentStep(2);
    }
  };

  const handleAddDemoImage = (type: string) => {
    const urls: Record<string, { url: string; caption: string }> = {
      profile: {
        url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=700&auto=format&fit=crop&q=80',
        caption: 'Cushion / connector detail view',
      },
      rear: {
        url: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=700&auto=format&fit=crop&q=80',
        caption: 'Rear label & serial number barcode',
      },
      packaging: {
        url: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=700&auto=format&fit=crop&q=80',
        caption: 'Original packaging box integrity',
      },
    };

    const chosen = urls[type] || urls.profile;
    setImages(prev => [
      ...prev,
      {
        id: `img-${Date.now()}-${Math.random()}`,
        url: chosen.url,
        caption: chosen.caption,
        isPrimary: false,
      },
    ]);
  };

  const handleSetPrimaryImage = (id: string) => {
    setImages(prev => prev.map(img => ({ ...img, isPrimary: img.id === id })));
  };

  const handleRemoveImage = (id: string) => {
    if (images.length === 1) {
      showToast({ title: 'At least one image required', description: 'The return must retain at least one product photo for AI assessment.', type: 'warning' });
      return;
    }
    setImages(prev => {
      const remaining = prev.filter(img => img.id !== id);
      if (!remaining.some(img => img.isPrimary) && remaining.length > 0) {
        remaining[0].isPrimary = true;
      }
      return remaining;
    });
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const newReturn = await ReturnService.registerReturn({
        sku: selectedSku,
        hubId,
        quantity: parseInt(quantity, 10) || 1,
        orderReference,
        returnReason: `${returnReason}. Known damage notes: ${knownDamage}. Functional test notes: ${initialFunctionalNotes}`,
        reportedCondition,
        packagingCondition,
        accessoryCompleteness,
        images: images.map(img => ({ url: img.url, caption: img.caption })),
      });

      showToast({
        title: 'Return Registered Successfully',
        description: `RMA ${newReturn.rmaNumber} created. Launching AI inference assessment...`,
        type: 'success',
      });

      navigate(`/returns/${newReturn.id}/assessment`);
    } catch (err: any) {
      showToast({ title: 'Registration Failed', description: err.message, type: 'error' });
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, label: 'Product Details', icon: Package },
    { number: 2, label: 'Reported Condition', icon: FileText },
    { number: 3, label: 'Inspection Images', icon: Camera },
    { number: 4, label: 'Review & Confirm', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Register Customer Return
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Intake wizard for returned goods. Captures product condition, images for CNN condition assessment, and prepares item for AI pre-screening.
        </p>
      </div>

      {/* Progress Steps Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        {steps.map(s => {
          const Icon = s.icon;
          const isActive = currentStep === s.number;
          const isDone = currentStep > s.number;

          return (
            <div key={s.number} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : isDone
                    ? 'bg-teal-500 text-slate-950 font-bold'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.number}
              </div>
              <span
                className={`text-xs hidden md:inline font-medium ${
                  isActive ? 'text-slate-900 font-semibold' : isDone ? 'text-teal-700' : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step 1: Product Information */}
      {currentStep === 1 && (
        <Card>
          <CardHeader
            title="Step 1: Product & Order Information"
            subtitle="Specify the returned item SKU, receipt order, and local drop-off facility"
          />
          <CardContent className="space-y-4">
            {/* Mode Switcher: Existing vs New Product */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">Product Selection Method</span>
                <span className="text-[11px] text-slate-500">Choose an existing catalog SKU or register a new unlisted product</span>
              </div>
              <div className="inline-flex rounded-lg p-0.5 bg-white border border-slate-200 shadow-2xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsCustomProduct(false)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    !isCustomProduct
                      ? 'bg-slate-900 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Existing Catalog Product
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomProduct(true)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isCustomProduct
                      ? 'bg-teal-600 text-white shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  + Add New Product (Not in List)
                </button>
              </div>
            </div>

            {!isCustomProduct ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Product SKU & Name *"
                  value={selectedSku}
                  onChange={e => {
                    if (e.target.value === '__NEW_PRODUCT__') {
                      setIsCustomProduct(true);
                    } else {
                      setSelectedSku(e.target.value);
                    }
                  }}
                  options={[
                    ...productList.map(p => ({
                      value: p.sku,
                      label: `${p.sku} — ${p.name} ($${p.sellingPrice.toFixed(2)})`,
                    })),
                    { value: '__NEW_PRODUCT__', label: '+ [Enter New / Unlisted Product...]' },
                  ]}
                />

                <Select
                  label="Intake Hub Location *"
                  value={hubId}
                  onChange={e => setHubId(e.target.value)}
                  options={hubs.map(h => ({
                    value: h.id,
                    label: `${h.name} (${h.city}, ${h.state})`,
                  }))}
                />
              </div>
            ) : (
              <div className="space-y-3 p-4 bg-teal-50/50 border border-teal-200/80 rounded-xl">
                <div className="flex items-center justify-between pb-2 border-b border-teal-100">
                  <div className="flex items-center gap-2 text-teal-900 font-semibold text-xs">
                    <Plus className="w-4 h-4 text-teal-700" />
                    <span>Register New Unlisted Product</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCustomProduct(false)}
                    className="text-[11px] text-teal-800 hover:underline font-medium"
                  >
                    &larr; Back to Catalog List
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Product Name *"
                    required
                    placeholder="e.g. Sony WH-1000XM5 ANC Headphones"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                  />
                  <Input
                    label="SKU Identifier *"
                    required
                    placeholder="e.g. SKU-SNY-901"
                    value={customSku}
                    onChange={e => setCustomSku(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Select
                    label="Category *"
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    options={[
                      { value: 'Consumer Electronics', label: 'Consumer Electronics' },
                      { value: 'Audio & Sound', label: 'Audio & Sound' },
                      { value: 'Wearables', label: 'Wearables' },
                      { value: 'Computing', label: 'Computing' },
                      { value: 'Smart Home', label: 'Smart Home' },
                      { value: 'Home Appliances', label: 'Home Appliances' },
                    ]}
                  />
                  <Input
                    label="Brand Name *"
                    required
                    placeholder="e.g. Sony"
                    value={customBrand}
                    onChange={e => setCustomBrand(e.target.value)}
                  />
                  <Input
                    label="Variant / Spec"
                    placeholder="e.g. Midnight Black, 30hr Battery"
                    value={customVariant}
                    onChange={e => setCustomVariant(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Estimated Resale Price ($) *"
                    required
                    type="number"
                    step="0.01"
                    value={customPrice}
                    onChange={e => setCustomPrice(e.target.value)}
                  />
                  <Select
                    label="Intake Hub Location *"
                    value={hubId}
                    onChange={e => setHubId(e.target.value)}
                    options={hubs.map(h => ({
                      value: h.id,
                      label: `${h.name} (${h.city}, ${h.state})`,
                    }))}
                  />
                </div>

                <Input
                  label="Product Photo Reference URL (Optional)"
                  placeholder="https://images.unsplash.com/..."
                  value={customImageUrl}
                  onChange={e => setCustomImageUrl(e.target.value)}
                />
              </div>
            )}

            {!isCustomProduct && selectedProduct && (
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-3">
                <img
                  src={selectedProduct.imageUrl}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                />
                <div className="text-xs">
                  <p className="font-semibold text-slate-900">{selectedProduct.name}</p>
                  <p className="text-slate-500">Variant: {selectedProduct.variant} &bull; Category: {selectedProduct.category}</p>
                  <p className="text-teal-700 font-medium mt-0.5">Resale Target Price: ${selectedProduct.sellingPrice.toFixed(2)}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Customer Order Reference *"
                required
                value={orderReference}
                onChange={e => setOrderReference(e.target.value)}
              />

              <Input
                label="Quantity Returned *"
                required
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Return Reason *
              </label>
              <textarea
                rows={3}
                required
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950"
                placeholder="Reason customer specified for return..."
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={handleProceedFromStep1}
            >
              Continue to Condition Details
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Condition Details */}
      {currentStep === 2 && (
        <Card>
          <CardHeader
            title="Step 2: Condition Information"
            subtitle="Record initial visual and packaging assessment from customer drop-off"
          />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Customer Reported Condition *"
                value={reportedCondition}
                onChange={e => setReportedCondition(e.target.value as any)}
                options={[
                  { value: 'unopened', label: 'Unopened / Factory Sealed' },
                  { value: 'like_new', label: 'Like New (Minimal Use)' },
                  { value: 'minor_wear', label: 'Minor Wear / Cosmetic Scuff' },
                  { value: 'defective', label: 'Defective / Malfunction' },
                  { value: 'damaged', label: 'Physical Impact / Damaged' },
                ]}
              />

              <Select
                label="Packaging Condition *"
                value={packagingCondition}
                onChange={e => setPackagingCondition(e.target.value as any)}
                options={[
                  { value: 'intact', label: 'Original Box Mint' },
                  { value: 'opened_good', label: 'Opened Box Clean' },
                  { value: 'damaged', label: 'Damaged / Crushed Box' },
                  { value: 'missing', label: 'Missing Original Box' },
                ]}
              />

              <Select
                label="Accessory Completeness *"
                value={accessoryCompleteness}
                onChange={e => setAccessoryCompleteness(e.target.value as any)}
                options={[
                  { value: 'complete', label: 'All Cables & Docs Present' },
                  { value: 'partial', label: 'Missing Some Accessories' },
                  { value: 'missing', label: 'No Accessories Included' },
                ]}
              />
            </div>

            <div>
              <Input
                label="Known or Customer-Reported Damage"
                value={knownDamage}
                onChange={e => setKnownDamage(e.target.value)}
                placeholder="e.g. Scratches on left corner, torn sleeve"
              />
            </div>

            <div>
              <Input
                label="Preliminary Counter Diagnostic / Functional Notes"
                value={initialFunctionalNotes}
                onChange={e => setInitialFunctionalNotes(e.target.value)}
                placeholder="e.g. Powers on, battery charges at 15W"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => setCurrentStep(1)}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => setCurrentStep(3)}
            >
              Continue to Images
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: Product Images */}
      {currentStep === 3 && (
        <Card>
          <CardHeader
            title="Step 3: Upload Product Inspection Photos"
            subtitle="Images will be parsed by MobileNetV2 CNN Defect Classification model"
          />
          <CardContent className="space-y-5">
            {/* Upload guidelines notice */}
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Accepted formats: JPG, PNG, WEBP. Max file size: 10 MB per image.</span>
              </div>
              <span className="text-[11px] font-mono text-blue-700">MobileNetV2 CNN Ready</span>
            </div>

            {/* Photos preview gallery */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {images.map(img => (
                <div
                  key={img.id}
                  className={`relative rounded-xl border overflow-hidden p-2 bg-slate-50 transition-all ${
                    img.isPrimary ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-slate-200'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.caption}
                    className="w-full h-36 object-cover rounded-lg bg-slate-200"
                  />
                  <div className="mt-2 text-xs">
                    <p className="font-semibold text-slate-800 truncate">{img.caption}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(img.id)}
                        className={`text-[11px] flex items-center gap-1 font-medium ${
                          img.isPrimary ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${img.isPrimary ? 'fill-teal-500 text-teal-600' : ''}`} />
                        {img.isPrimary ? 'Primary View' : 'Set as Primary'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.id)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Remove image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Demo Upload Helper buttons */}
            <div className="pt-2">
              <p className="text-xs font-semibold text-slate-700 mb-2">Simulate Adding Multi-Angle Camera Photos:</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Camera className="w-3.5 h-3.5 text-blue-600" />}
                  onClick={() => handleAddDemoImage('profile')}
                >
                  Add Close-up Angle Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Camera className="w-3.5 h-3.5 text-blue-600" />}
                  onClick={() => handleAddDemoImage('rear')}
                >
                  Add Serial / Barcode Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Camera className="w-3.5 h-3.5 text-blue-600" />}
                  onClick={() => handleAddDemoImage('packaging')}
                >
                  Add Packaging Box Photo
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => setCurrentStep(2)}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => setCurrentStep(4)}
            >
              Review Return Details
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 4: Summary & Submit */}
      {currentStep === 4 && (
        <Card>
          <CardHeader
            title="Step 4: Review Return Summary"
            subtitle="Confirm captured return information before saving into the HIEN inspection workspace"
          />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Product & Hub</p>
                <div><strong>SKU:</strong> <span className="font-mono text-blue-700 font-semibold">{selectedSku}</span></div>
                <div><strong>Product:</strong> {selectedProduct?.name}</div>
                <div><strong>Order Reference:</strong> <span className="font-mono">{orderReference}</span></div>
                <div><strong>Intake Hub:</strong> {hubs.find(h => h.id === hubId)?.name}</div>
                <div><strong>Quantity:</strong> {quantity} unit(s)</div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Condition & Inspection Readiness</p>
                <div><strong>Reported Condition:</strong> <span className="capitalize">{reportedCondition.replace('_', ' ')}</span></div>
                <div><strong>Packaging:</strong> <span className="capitalize">{packagingCondition.replace('_', ' ')}</span></div>
                <div><strong>Accessories:</strong> <span className="capitalize">{accessoryCompleteness}</span></div>
                <div><strong>Images Attached:</strong> {images.length} photo(s) ready for CNN condition scan</div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
              <strong>Notice:</strong> Submitting will create the return record and immediately transition it to the AI Inference workspace for preliminary disposition classification and CNN condition assessment. Resale admission requires subsequent physical inspection sign-off.
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => setCurrentStep(3)}
              disabled={isSubmitting}
            >
              Back
            </Button>
            <Button
              variant="success"
              size="sm"
              isLoading={isSubmitting}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              onClick={handleFinalSubmit}
            >
              Submit Return & Run AI Pre-Screen
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};
