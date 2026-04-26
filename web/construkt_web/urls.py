from django.urls import path
from projects.views import index

urlpatterns = [
    path('', index, name='home'),
]
