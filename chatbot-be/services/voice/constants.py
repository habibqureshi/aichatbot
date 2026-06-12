from graph.bot_graph import get_clinic_graph, get_order_graph

DEFAULT_ORDER_GREETING = "How can I help you today?"
ORDER_GREETING_KEY = "GREETING"

DEFAULT_PHRASES = [
    "One moment, please.",
    "Just a second.",
    "Let me take care of that.",
    "Checking that for you now.",
    "One moment while I handle it.",
]

TOOL_PHRASES: dict[str, list[str]] = {
    # ── Clinic ────────────────────────────────────────────────────────────────
    "find_doctors": [
        "Let me find the right doctor for you.",
        "Looking up available specialists now.",
        "One moment while I check our doctors.",
    ],
    "get_doctor_weekly_schedule": [
        "Let me check the doctor's schedule.",
        "Pulling up the weekly availability now.",
        "One moment while I look at the schedule.",
    ],
    "find_available_slots": [
        "Checking available appointment slots.",
        "Let me find open times for you.",
        "One moment while I look at availability.",
    ],
    "book_appointment": [
        "I'm booking that appointment for you now.",
        "One moment while I schedule your visit.",
        "Setting up your appointment right now.",
    ],
    "cancel_appointment": [
        "Cancelling your appointment now.",
        "One moment while I process that cancellation.",
        "Let me take care of that for you.",
    ],
    "reschedule_appointment": [
        "Rescheduling your appointment now.",
        "One moment while I update your booking.",
        "Let me find a new time for you.",
    ],
    "get_my_appointments": [
        "Let me check your upcoming appointments.",
        "Pulling up your schedule now.",
        "One moment while I look at your bookings.",
    ],
    # ── Restaurant / order ────────────────────────────────────────────────────
    "list_menu": [
        "Let me pull up the menu for you.",
        "Just checking the menu right now.",
        "One moment while I get the menu.",
    ],
    "create_order": [
        "I'm setting up your order now. One moment.",
        "Got it, starting your order now.",
        "Let me create your order real quick.",
    ],
    "add_order_item": [
        "Adding that to your order.",
        "Got it, adding it now.",
        "One moment, I'm updating your order.",
    ],
    "confirm_order": [
        "Confirming your order now.",
        "Let me finalize your order.",
        "Almost done, confirming everything now.",
    ],
    "cancel_order": [
        "Updating your order.",
        "Cancelling that for you now.",
        "One moment, I'll handle the cancellation.",
    ],
    "update_order_item": [
        "Updating your order.",
        "Making that change now.",
        "One moment, updating it.",
    ],
    "remove_order_item": [
        "Updating your order.",
        "Removing that for you now.",
        "One moment, I'm updating it.",
    ],
    "get_order": [
        "Let me check your order and reservations.",
        "One moment while I pull up your order.",
        "Checking your current order now.",
    ],
    "price_order": [
        "Getting pricing details for you.",
        "Let me check the total for you.",
        "One moment while I calculate that.",
    ],
    "get_my_latest_order_and_reservations": [
        "Let me check your order and reservations.",
        "Pulling your latest details now.",
        "Checking your recent activity.",
    ],
    "get_customer_profile": [
        "Let me check your saved details.",
        "One moment while I pull your profile.",
        "Checking your information now.",
    ],
    "update_customer_profile": [
        "Got it, updating your details now.",
        "Saving your changes now.",
        "Updating your profile.",
    ],
    "knowledge_retriever": [
        "Let me look that up for you.",
        "Checking that for you now.",
        "One moment while I find that information.",
    ],
    "check_table_availability": [
        "Let me check table availability for you.",
        "Checking tables for that time now.",
        "One moment while I check availability.",
    ],
    "reserve_table": [
        "Great, I'll reserve a table for you now.",
        "Booking your table now.",
        "One moment while I make the reservation.",
    ],
    "update_reservation": [
        "Sure, let me update your reservation.",
        "Updating your booking now.",
        "One moment, changing your reservation.",
    ],
    "cancel_reservation": [
        "Okay, I'll cancel that reservation now.",
        "Cancelling your booking now.",
        "One moment, removing your reservation.",
    ],
}

# Markers the LLM emits to signal call-flow transitions.
VOICE_FORBIDDEN_MARKERS: tuple[str, ...] = (
    "**FINISH_CONVERSATION**",
    "**NEEDS_HUMAN_INTERVENTION**",
)

# Tools whose on_tool_start / on_tool_end events are logged in the pipeline.
ORDER_STREAM_TOOL_NAMES = frozenset(
    {
        "list_menu",
        "create_order",
        "add_order_item",
        "update_order_item",
        "remove_order_item",
        "cancel_order",
        "confirm_order",
        "get_order",
        "get_my_latest_order_and_reservations",
        "price_order",
        "get_customer_profile",
        "update_customer_profile",
        "knowledge_retriever",
        "check_table_availability",
        "reserve_table",
        "update_reservation",
        "cancel_reservation",
    }
)

# Maps the INSTALLED_FOR app-setting value to the matching graph factory.
GRAPH_FUNC = {
    "clinic": get_clinic_graph,
    "restaurant": get_order_graph,
}
