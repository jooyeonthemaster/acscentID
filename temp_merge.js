const fs = require('fs');
const ko = require('./src/messages/ko.json');
const es = require('./src/messages/es.json');

// Spanish translations for all missing keys
const translations = {
  // payment missing keys
  "payment.bankTransferShort": "Transferencia bancaria",
  "payment.preparing": "En preparación",
  "payment.cardAndEasyPaySoon": "Tarjeta y pago rápido estarán disponibles pronto",
  "payment.selectPaymentLabel": "Seleccionar método de pago: {label}",
  "payment.selectPaymentLabelPreparing": "Seleccionar método de pago: {label} (en preparación)",
  "payment.bankTransferSublabel": "Depósito directo",

  // input.step3 missing
  "input.step3.customPlaceholder": "Ingresa otra personalidad",

  // input.step4 missing
  "input.step4.customPlaceholder": "Ingresa otro punto de encanto",

  // input.step5 missing keys
  "input.step5.imageGuide": "Guía de proporción de imagen",
  "input.step5.imageRatioDesc": "Sube una imagen vertical con proporción 5:6 para obtener los mejores resultados.",
  "input.step5.imageRatioHint": "(Ej.: 500x600px, 400x480px, etc.)",
  "input.step5.tip": "Consejo:",
  "input.step5.tipIdol": "Elige una foto de alta calidad donde se vea bien el sujeto de análisis para un análisis más preciso.",
  "input.step5.tipPersonal": "Elige una foto de alta calidad donde se vea bien tu rostro para un análisis más preciso.",
  "input.step5.upload": "Subir",
  "input.step5.uploadImage": "Subir imagen",
  "input.step5.optimizing": "Optimizando imagen...",
  "input.step5.autoOptimize": "* La imagen se optimiza automáticamente (máx. 800px, calidad 80%)",
  "input.step5.reviewGuide": "Ver guía de nuevo",
  "input.step5.aiRecommendation": "Para recomendación de aroma IA",
  "input.step5.modeling3d": "Para modelado 3D",
  "input.step5.modelingRequest": "Solicitud de modelado",
  "input.step5.optional": "(Opcional)",
  "input.step5.modelingPlaceholder": "Ej.: micrófono en la mano / expresión sonriente / cabello negro",
  "input.step5.modelingNote": "* Las solicitudes complejas pueden ser difíciles de implementar",
  "input.step5.modelingImageGuide": "Guía de imagen para modelado",
  "input.step5.modelingWhite": "La figura se imprime en un solo color (blanco).",
  "input.step5.modelingSimplified": "Los detalles complejos pueden simplificarse.",
  "input.step5.modelingAngle": "Se recomiendan imágenes claras de frente o en ángulo 3/4",
  "input.step5.figureDesc": "Sube una imagen para la recomendación de aroma IA y otra para el modelado 3D por separado.",
  "input.step5.titleIdol": "Imagen del sujeto de análisis",
  "input.step5.titlePersonal": "Mi imagen",
  "input.step5.descIdol": "Sube una imagen del sujeto de análisis. Se usará para la recomendación de perfume.",
  "input.step5.descPersonal": "Sube tu imagen. Se usará para la recomendación de perfume.",

  // input.analyzing missing
  "input.analyzing.userName": "De {name}",
  "input.analyzing.perfumeAnalyzing": "Analizando perfume...",
  "input.analyzing.quotes": [
    "Esta persona es perfecta, hasta en su aroma...",
    "El aroma es la ropa invisible del alma.",
    "Este aroma hace latir el corazón... tum tum",
    "Un buen aroma permanece para siempre en la memoria.",
    "Tu corazón se convierte en fragancia...",
    "El aroma es el lenguaje del amor que trasciende el tiempo.",
    "Alerta: este aroma roba corazones...",
    "Capturando sentimientos de amor en fragancia...",
    "El perfume es un abrazo invisible.",
    "Tu sinceridad, demostrada a través del aroma.",
    "El aroma es el detonante más poderoso de los recuerdos.",
    "Creando una fragancia especial, única en el mundo...",
    "Un buen aroma es más fuerte que cualquier carta de presentación.",
    "El aroma es la llave que abre la puerta de los recuerdos."
  ],

  // result missing keys
  "result.loadingHintEmoji": "Por favor, espera un momento ✨",
  "result.analysisImage": "Imagen de análisis",
  "result.recommendedPerfume": "Perfume recomendado",
  "result.customPerfume": "Perfume personalizado",
  "result.customPerfumeAlt": "Perfume a medida",
  "result.errorTitle": "Ocurrió un error",
  "result.orderError": "Ocurrió un error al procesar el pedido. Por favor, inténtalo de nuevo.",
  "result.paymentFailed": "El pago ha fallado.",
  "result.noMatchingPerfume": "No se encontró un perfume compatible.",
  "result.retryAnalysis": "¡Intenta analizar de nuevo! 💫",
  "result.noComparisonData": "No hay datos de análisis comparativo disponibles.",
  "result.friendResult": "💌 Resultado de perfume de un amigo",
  "result.friendTitle": "Descubre la fragancia",
  "result.friendSubtitle": "de tu amigo",
  "result.startAnalysis": "Yo también quiero un análisis",
  "result.shareThisResult": "Compartir este resultado",
  "result.notFoundTitle": "No se encontró el resultado",
  "result.notFoundDesc": "El enlace ha expirado o es incorrecto.",
  "result.anonymous": "Anónimo",

  // checkout missing keys
  "checkout.bankLabel": "Banco",
  "checkout.accountLabel": "Número de cuenta",
  "checkout.accountHolder": "Titular de la cuenta",
  "checkout.depositAfterShipping": "Se enviará en 2~3 días después de confirmar el depósito.",
  "checkout.sameNameWarning": "El nombre del depositante debe coincidir con el del comprador.",
  "checkout.itemCount": "({count} uds.)",
  "checkout.orderCreateFailed": "Error al crear el pedido",
  "checkout.fillAllRequired": "Por favor, completa todos los campos obligatorios.",
  "checkout.orderProduct": "Productos del pedido",
  "checkout.couponApply": "Aplicar cupón",
  "checkout.paymentAmountLabel": "Monto del pago",
  "checkout.orderGuide": "Guía del pedido",
  "checkout.freeShippingOver": "Envío gratis en pedidos superiores a 50,000 KRW",
  "checkout.shippingAfterDeposit": "Envío en 2~3 días después de confirmar el depósito",
  "checkout.itemCountSuffix": "{count} uds.",
  "checkout.orderError": "Ocurrió un error al procesar el pedido. Por favor, inténtalo de nuevo.",
  "checkout.orderCreateFailedStatus": "Error al crear el pedido ({status})",
  "checkout.paymentFailed": "El pago ha fallado.",
  "checkout.sizeSelection": "Seleccionar tamaño",
  "checkout.productSelection": "Seleccionar producto",
  "checkout.graduationPerfumeSelection": "Seleccionar perfume de graduación",
  "checkout.signaturePerfumeLabel": "Perfume Signature",
  "checkout.analysisImage": "Imagen de análisis",
  "checkout.included": "Incluido",
  "checkout.figureSetTitle": "Set de figura + difusor",
  "checkout.figureSetDesc": "Figura impresa en 3D + esencia personalizada 5ml",
  "checkout.graduationPerfumeTitle": "Perfume de graduación 10ml",
  "checkout.graduationPerfumeDesc": "Perfume PPUDUCK + informe de análisis impreso",
  "checkout.signaturePerfumeTitle": "Perfume Signature PPUDUCK 10ml",
  "checkout.signaturePerfumeDesc": "Perfume Signature + llavero de perfume PPUDUCK",
  "checkout.sprayType": "Tipo spray",
  "checkout.includeFigure": "Figura 3D basada en análisis IA (fabricación personalizada)",
  "checkout.includeEssence": "Esencia personalizada (5ml)",
  "checkout.includePotBase": "Base de maceta",
  "checkout.freeShippingLabel": "Envío gratis",
  "checkout.shippingFeeAmount": "Envío 3,000 KRW",
  "checkout.includeGradPerfume": "Perfume de graduación personalizado (10ml)",
  "checkout.includeReport": "Informe de análisis impreso",
  "checkout.includeGradCard": "Tarjeta de felicitación de graduación 🎓",
  "checkout.includeSignaturePerfume": "Perfume Signature PPUDUCK (10ml)",
  "checkout.includeKeyring": "Lindo llavero de perfume PPUDUCK 🦆",
  "checkout.includePremiumPackage": "Paquete premium",
  "checkout.freeShippingOverInfo": "Envío gratis en pedidos de +50,000 KRW",
  "checkout.includeAnalysisPerfume": "Perfume personalizado con análisis IA ({size})",
  "checkout.includeAnalysisCard": "Tarjeta de resultados del análisis",
  "checkout.setProduct": "Producto en set",
  "checkout.orderNameMulti": "{name} y {count} más",

  // mypage missing simple keys
  "mypage.itemCount": "{count} uds.",
  "mypage.deleteFailed": "No se pudo eliminar",
  "mypage.deleteError": "Ocurrió un error al eliminar",
  "mypage.cancelFailed": "No se pudo procesar la solicitud de cancelación",
  "mypage.serverError": "Ocurrió un error en el servidor",
  "mypage.analysisImage": "Imagen de análisis",
  "mypage.paymentComplete": "Pago completado",
  "mypage.orderDate": "Fecha de pedido: {date}",

  // mypage.profile
  "mypage.profile": {
    "defaultUser": "Usuario",
    "profileAlt": "Perfil",
    "kakaoLogin": "Iniciar sesión con Kakao",
    "emailLogin": "Correo electrónico",
    "loginSuffix": "inicio de sesión",
    "logoutConfirm": "¿Deseas cerrar sesión?",
    "logout": "Cerrar sesión"
  },

  // mypage.sidebar
  "mypage.sidebar": {
    "home": "Ir al inicio",
    "analysisResults": "Resultados de análisis",
    "cart": "Carrito",
    "orderHistory": "Historial de pedidos",
    "couponBox": "Mis cupones",
    "inviteFriend": "Invitar amigos",
    "inviteDesc": "¡Invita a tus amigos y recibe beneficios especiales!",
    "linkCopy": "Copiar enlace",
    "linkCopied": "Copiado",
    "inviteLinkCopied": "¡Enlace de invitación copiado!",
    "linkCopyFailed": "No se pudo copiar el enlace",
    "shareTitle": "AC'SCENT - Encuentra tu perfume",
    "shareText": "¡Tu amigo te invitó a AC'SCENT! Encuentra tu perfume ideal con IA."
  },

  // mypage.stats
  "mypage.stats": {
    "myStats": "Mis estadísticas de actividad",
    "totalAnalyses": "Total de análisis",
    "confirmedRecipes": "Recetas confirmadas",
    "thisMonthActivity": "Actividad de este mes",
    "analysisLabel": "Análisis",
    "recipeLabel": "Receta",
    "totalActivity": "Actividad total",
    "recentActivity": "Actividad reciente",
    "noActivity": "Aún no hay actividad",
    "startFirstAnalysis": "Iniciar primer análisis",
    "recipeSaved": "Receta guardada",
    "analysisComplete": "Análisis completado",
    "justNow": "Hace un momento",
    "minutesAgo": "Hace {count} min",
    "hoursAgo": "Hace {count} hr",
    "daysAgo": "Hace {count} días",
    "startNewAnalysis": "Iniciar nuevo análisis",
    "aiFindsScent": "La IA encontrará tu perfume ideal",
    "goAnalyze": "Ir a analizar →"
  },

  // mypage.orders (convert from string to object matching ko)
  "mypage.orders": {
    "setProduct": "Producto en set"
  },

  // mypage.cart (convert from string to object matching ko)
  "mypage.cart": {
    "loading": "Cargando carrito...",
    "empty": "Tu carrito está vacío",
    "emptyHint": "¡Agrega un perfume que te guste desde los resultados de análisis!",
    "startAnalysis": "Iniciar análisis",
    "selectAll": "Seleccionar todo ({selected}/{total})",
    "deleteSelected": "Eliminar seleccionados",
    "noSelectedItems": "No hay productos seleccionados",
    "deletedItems": "Se eliminaron {count} producto(s)",
    "removedFromCart": "Eliminado del carrito",
    "deleteFailed": "No se pudo eliminar",
    "noCheckoutItems": "No hay productos para pagar",
    "checkRecipe": "Ver receta",
    "setProduct": "Producto en set",
    "productAmount": "Subtotal del producto",
    "shippingFee": "Costo de envío",
    "freeShippingNote": "Envío gratis en pedidos superiores a 50,000 KRW",
    "selectedItems": "{count} producto(s) seleccionado(s)",
    "allItems": "Total de {count} producto(s)",
    "goCheckout": "Realizar pedido →",
    "perfumeAnalysisInfo": "Información de análisis del perfume",
    "analysisResult": "Resultado del análisis",
    "customRecipe": "Receta de perfume personalizada",
    "recipeAdjusted": "Mi receta ajustada a través de feedback",
    "noDetailedInfo": "No hay información detallada del análisis",
    "checkOnResultPage": "Ver en la página de resultados",
    "makeFeedbackRecipe": "¡Crea tu propia receta a través del feedback!",
    "viewResultDetail": "Ver detalle del resultado"
  },

  // mypage.gallery
  "mypage.gallery": {
    "emptyTitle": "Tu galería está vacía",
    "emptyDesc": "¡Analiza una imagen y encuentra tu perfume ideal!",
    "startAnalysis": "Iniciar análisis →",
    "addToCart": "Agregar al carrito",
    "deselectAll": "Deseleccionar todo",
    "selectAll": "Seleccionar todo",
    "selectedCount": "{count} seleccionado(s)",
    "cancel": "Cancelar",
    "viewDetail": "Ver detalle",
    "offline": "Sin conexión",
    "purchase": "Comprar",
    "recipeCount": "{count} receta(s)",
    "viewMore": "Ver más",
    "deleteConfirm": "¿Deseas eliminar?",
    "deleteDesc": "Se eliminará el resultado de análisis de \"{name}\".",
    "deleteIrreversible": "Esta acción no se puede deshacer.",
    "delete": "Eliminar",
    "confirmedRecipe": "Receta confirmada",
    "viewResult": "Ver detalle del resultado",
    "checkRecipe": "Ver receta",
    "analyzedAt": "Analizado {time}",
    "confirmedRecipeTitle": "Receta confirmada",
    "perfumeAnalysisInfo": "Información de análisis del perfume",
    "customRecipe": "Receta de perfume personalizada",
    "perfumePerfumeLabel": "Perfume 10ml",
    "perfumeSub10": "Ingrediente 2g",
    "perfumeLabel50": "Perfume 50ml",
    "perfumeSub50": "Ingrediente 10g",
    "oilLabel": "Aceite 5ml",
    "oilSub": "Ingrediente 5g",
    "totalIngredient": "Total de ingredientes",
    "recipeAdjusted": "Mi receta ajustada a través de feedback",
    "noDetailedInfo": "No hay información detallada del análisis",
    "checkOnResultPage": "Ver en la página de resultados",
    "makeFeedbackRecipe": "¡Crea tu propia receta a través del feedback!",
    "itemsSelected": "Producto(s) seleccionado(s)",
    "addToCartAction": "Agregar al carrito",
    "addedToCart": "¡Agregado al carrito!",
    "itemsUnit": "uds.",
    "alreadyInCart": "({count} ya está(n) en el carrito)",
    "addedToCartDesc": "El producto se agregó al carrito",
    "addToCartFailed": "No se pudo agregar al carrito",
    "addToCartError": "Ocurrió un error al agregar al carrito",
    "continueShopping": "Seguir comprando",
    "goToCart": "Carrito",
    "errorOccurred": "Ups, ocurrió un problema",
    "justNow": "Hace un momento",
    "minutesAgo": "Hace {count} min",
    "hoursAgo": "Hace {count} hr",
    "daysAgo": "Hace {count} días",
    "recipeLabel": "Receta",
    "close": "Cerrar"
  },

  // mypage.recipes
  "mypage.recipes": {
    "emptyTitle": "No hay recetas guardadas",
    "emptyDesc": "¡Deja tu feedback y crea tu propia receta!",
    "startAnalysis": "Iniciar análisis",
    "independentRecipes": "Recetas independientes",
    "unlinkedRecipes": "Recetas no vinculadas a un análisis",
    "retention": "Duración",
    "viewDetail": "Ver detalle",
    "deleteConfirm": "¿Deseas eliminar esta receta?",
    "justNow": "Hace un momento",
    "minutesAgo": "Hace {count} min",
    "hoursAgo": "Hace {count} hr",
    "daysAgo": "Hace {count} días"
  },

  // mypage.recipeModal
  "mypage.recipeModal": {
    "perfumeRecipe": "Receta de perfume",
    "customPerfume": "Perfume personalizado",
    "recommendedPerfume": "Perfume recomendado",
    "matchRate": "Tasa de coincidencia",
    "scentNotes": "Notas de aroma",
    "scentNotesDesc": "Cómo cambia el aroma con el tiempo",
    "topNote": "Nota de salida",
    "middleNote": "Nota de corazón",
    "baseNote": "Nota de fondo",
    "topNoteDefault": "Cítrico",
    "topNoteDefaultDesc": "Aroma ligero que define la primera impresión",
    "middleNoteDefault": "Floral",
    "middleNoteDefaultDesc": "El aroma central y corazón del perfume",
    "baseNoteDefault": "Amaderado",
    "baseNoteDefaultDesc": "Aroma profundo y persistente",
    "topNoteTime": "0-30 min",
    "middleNoteTime": "30 min-2 hr",
    "baseNoteTime": "2-6 hr",
    "scentTimeline": "Línea de tiempo del aroma",
    "topTimelineLabel": "Salida (0-30 min)",
    "middleTimelineLabel": "Corazón (30 min-2 hr)",
    "baseTimelineLabel": "Fondo (2-6 hr)",
    "perfumeProfile": "Perfil del perfume",
    "categoryAnalysis": "Análisis de categoría de aroma",
    "mainCategory": "Categoría principal",
    "noDetailedRecipe": "No hay información detallada de la receta",
    "recipeNotSavedYet": "Este pedido fue creado antes de que se guardara la información de la receta.",
    "perfumeLabel": "Perfume: {name}"
  },

  // mypage.couponList
  "mypage.couponList": {
    "noCoupons": "Aún no tienes cupones",
    "noCouponsHint": "¡Haz clic en el cohete de la página principal para obtener cupones!",
    "all": "Todos ({count})",
    "available": "Disponibles ({count})",
    "used": "Usados ({count})",
    "noAvailable": "No hay cupones disponibles",
    "noUsed": "No hay cupones usados",
    "usedLabel": "Usado",
    "expiredLabel": "Expirado",
    "discountLabel": "Descuento",
    "usedDate": "Fecha de uso: {date}",
    "expiryDate": "Fecha de expiración: {date}",
    "noExpiry": "Fecha de expiración: Ilimitada"
  },

  // mypage.couponUsage
  "mypage.couponUsage": {
    "couponCode": "Código de cupón",
    "copy": "Copiar",
    "copied": "Copiado",
    "howToUse": "Cómo usar",
    "welcomeStep1": "Completa el análisis de perfume y elige tu fragancia",
    "welcomeStep2": "Presiona el botón \"Aplicar cupón\" en la página de pago",
    "welcomeStep3": "Selecciona el cupón de bienvenida para aplicar el 15% de descuento automáticamente",
    "welcomeTip": "¡Es aún más especial si lo usas en tu primera compra!",
    "birthdayStep1": "En la página de pago, selecciona \"Aplicar cupón\" → cupón de cumpleaños",
    "birthdayStep2": "Elige entre \"Mi cumpleaños\" o \"Un cumpleaños especial\"",
    "birthdayStep3": "Adjunta el comprobante (captura de pantalla)",
    "birthdayTip": "Comprobante: Adjunta una captura de pantalla que muestre la fecha de cumpleaños de Namuwiki, Wikipedia, redes sociales oficiales, etc.",
    "referralStep1": "Este es un cupón de agradecimiento por invitar amigos",
    "referralStep2": "Presiona el botón \"Aplicar cupón\" en la página de pago",
    "referralStep3": "Selecciona el cupón de referido para aplicar el 10% de descuento",
    "referralTip": "¡Invita a más amigos para obtener más cupones!",
    "repurchaseStep1": "Este es un cupón de agradecimiento para clientes recurrentes",
    "repurchaseStep2": "Presiona el botón \"Aplicar cupón\" en la página de pago",
    "repurchaseStep3": "Selecciona el cupón de recompra para aplicar el 10% de descuento",
    "repurchaseTip": "¡Muchas gracias por volver!",
    "discountSuffix": "% de descuento",
    "goMakePerfume": "Ir a crear perfume"
  },

  // mypage.invite
  "mypage.invite": {
    "title": "Invitar amigos",
    "desc": "¡Emprende un viaje de fragancias con tus amigos!",
    "linkCopied": "¡Enlace de invitación copiado!",
    "linkCopyFailed": "No se pudo copiar el enlace",
    "shareTitle": "AC'SCENT - Encuentra tu perfume",
    "shareText": "¡Tu amigo te invitó a AC'SCENT! Encuentra tu perfume ideal con IA."
  },

  // coupon missing keys
  "coupon.loadingCoupons": "Cargando cupones...",
  "coupon.availableCount": "{count} cupón(es) disponible(s)",
  "coupon.noAvailableCoupons": "No hay cupones disponibles",
  "coupon.noCouponsOwned": "No tienes cupones",
  "coupon.notUsable": "No se puede usar",
  "coupon.checkCondition": "Verifica las condiciones de uso",
  "coupon.loginToUseCoupon": "Inicia sesión para usar cupones",
  "coupon.couponLoadFailed": "No se pudieron cargar los cupones",
  "coupon.discountAmountWon": "-{amount} KRW de descuento",
  "coupon.discountPercent": "{percent}% de descuento"
};

// Deep clone es
const result = JSON.parse(JSON.stringify(es));

// Apply flat path translations
function setVal(obj, path, value) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] === 'string') {
      // Type mismatch: was string, needs to be object
      cur[parts[i]] = {};
    }
    if (!(parts[i] in cur) || typeof cur[parts[i]] !== 'object') {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

for (const [path, value] of Object.entries(translations)) {
  setVal(result, path, value);
}

// Write the result
const output = JSON.stringify(result, null, 2);
fs.writeFileSync('./src/messages/es.json', output + '\n', 'utf8');
console.log('Done. Written es.json');

// Verify
const esNew = require('./src/messages/es.json');
function findMissing(koObj, esObj, path) {
  const missing = [];
  for (const key of Object.keys(koObj)) {
    const currentPath = path ? path + '.' + key : key;
    if (!(key in esObj)) {
      missing.push(currentPath);
    } else if (typeof koObj[key] === 'object' && !Array.isArray(koObj[key]) && typeof esObj[key] === 'object' && !Array.isArray(esObj[key])) {
      missing.push(...findMissing(koObj[key], esObj[key], currentPath));
    }
  }
  return missing;
}
const stillMissing = findMissing(ko, esNew, '');
if (stillMissing.length > 0) {
  console.log('Still missing:', stillMissing.length);
  stillMissing.forEach(k => console.log(' -', k));
} else {
  console.log('All keys synced successfully!');
}
